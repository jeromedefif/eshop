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
};
run(['-f', 'tests/fixtures/baseline.sql']);
run([], `
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
`);
for (const path of ['202608110001_product_lifecycle.sql', '20260921210504_security_order_delivery.sql']) run(['-f', `supabase/migrations/${path}`]);
run(['-f', 'tests/fixtures/legacy-checkout.sql']);
run(['-f', 'supabase/post-deploy/checkout_server_only.sql']);
console.log('Isolated test schema and security migrations initialized.');
