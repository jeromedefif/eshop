-- Disabled until an explicit production activation sets enabled_at.
create table public.welcome_email_settings (
  singleton boolean primary key default true check (singleton),
  enabled_at timestamptz
);
insert into public.welcome_email_settings(singleton) values (true);
create table public.welcome_email_deliveries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','review')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  claim_token uuid,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  last_error text
);
alter table public.welcome_email_settings enable row level security;
alter table public.welcome_email_deliveries enable row level security;
revoke all on public.welcome_email_settings, public.welcome_email_deliveries from public, anon, authenticated;
