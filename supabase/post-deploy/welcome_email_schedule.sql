-- Run after migration and deployment. Re-running does not re-enable a paused job.
DO $block$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'beginy-welcome-emails') THEN
    PERFORM cron.schedule('beginy-welcome-emails', '*/5 * * * *', $job$
      SELECT net.http_get(
        url := 'https://www.beginy.cz/api/cron/welcome-emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'beginy_email_cron_secret'
        )), timeout_milliseconds := 65000
      ) WHERE EXISTS (SELECT 1 FROM public.welcome_email_settings WHERE enabled_at IS NOT NULL);
    $job$);
    PERFORM cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname = 'beginy-welcome-emails';
  END IF;
END
$block$;
-- After preview approval and deployment verification, activate both in one transaction:
-- BEGIN;
-- UPDATE public.welcome_email_settings SET enabled_at = coalesce(enabled_at, now());
-- SELECT cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname = 'beginy-welcome-emails';
-- COMMIT;
-- Pause via cron.alter_job(active := false); retain enabled_at to preserve cutoff.
