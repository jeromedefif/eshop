alter table public.welcome_email_deliveries
  add column manual boolean not null default false,
  add column requested_by uuid,
  add column requested_at timestamptz;
