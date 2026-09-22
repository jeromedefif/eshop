-- Apply in one transaction after the database migration. Creates a DISABLED job.
-- Before activation, deploy and verify the worker and store its CRON_SECRET
-- as beginy_email_cron_secret in Vault. Never put the secret in this file.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'beginy-email-deliveries',
  '*/5 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.beginy.cz/api/cron/email-deliveries',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'beginy_email_cron_secret'
      )),
      timeout_milliseconds := 65000
    ) where exists (
      select 1 from public.email_deliveries
      where status in ('pending', 'failed', 'sending')
    );
  $job$
);
select cron.alter_job(jobid, active := false)
from cron.job where jobname = 'beginy-email-deliveries';

-- Activation is a separate step after a successful authorized worker probe:
-- select cron.alter_job(jobid, active := true) from cron.job
-- where jobname = 'beginy-email-deliveries';
-- To pause/roll back scheduling, use active := false. Keep the queued data.
