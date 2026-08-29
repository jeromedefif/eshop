create extension if not exists pg_net with schema extensions;

alter table public.profiles
  add column if not exists admin_registration_notification_status text not null default 'pending',
  add column if not exists admin_registration_notification_attempts integer not null default 0,
  add column if not exists admin_registration_notification_claimed_at timestamptz,
  add column if not exists admin_registration_notified_at timestamptz,
  add column if not exists admin_registration_notification_error text;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.notify_admin_on_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret
    into webhook_secret
  from vault.decrypted_secrets
  where name = 'beginy_registration_webhook_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    update public.profiles
    set admin_registration_notification_status = 'configuration_missing',
        admin_registration_notification_error = 'Webhook secret is not configured.'
    where id = new.id;
    return new;
  end if;

  perform net.http_post(
    url := 'https://www.beginy.cz/api/registration/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-registration-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object('id', new.id)
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    update public.profiles
    set admin_registration_notification_status = 'failed',
        admin_registration_notification_error = left(sqlerrm, 1000)
    where id = new.id;
    return new;
end;
$$;

revoke all on function private.notify_admin_on_new_profile() from public, anon, authenticated;

drop trigger if exists notify_admin_on_new_profile on public.profiles;
create trigger notify_admin_on_new_profile
after insert on public.profiles
for each row
execute function private.notify_admin_on_new_profile();
