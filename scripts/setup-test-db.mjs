import { spawnSync } from 'node:child_process';
const connection = process.env.TEST_DATABASE_URL;
if (!connection) throw new Error('Set TEST_DATABASE_URL to a fresh isolated local database ending in _test.');
const url = new URL(connection);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Refusing to initialize a non-local or non-test database.');
const run = (args, input) => {
  const result = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', ...args], {
    env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password) },
    encoding: 'utf8', input,
  });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error));
  return result.stdout.trim();
};
const version = run(['-Atc', 'SHOW server_version_num']);
if (Math.floor(Number(version) / 10000) !== 17) throw new Error('Tests require PostgreSQL 17 to match the production major version.');
console.log(`Test database: PostgreSQL ${run(['-Atc', 'SHOW server_version'])}`);
run(['-f', 'tests/fixtures/baseline.sql']);
run([], `
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
`);
for (const path of ['202608110001_product_lifecycle.sql', '20260921210504_security_order_delivery.sql', '20260922212511_restrict_legacy_function_access.sql', '20260924193610_remove_unused_pgjwt.sql']) run(['--single-transaction', '-f', `supabase/migrations/${path}`]);
run(['-f', 'tests/fixtures/legacy-checkout.sql']);
run(['-f', 'supabase/post-deploy/checkout_server_only.sql']);
console.log('Isolated test schema and security migrations initialized.');
