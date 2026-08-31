create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  variant text not null default 'info',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  target_category text,
  target_product_id bigint references public.products(id) on delete set null,
  dismissible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_variant_check
    check (variant in ('info', 'warning', 'important')),
  constraint announcements_target_check
    check (not (target_category is not null and target_product_id is not null)),
  constraint announcements_time_window_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists announcements_active_window_idx
  on public.announcements (is_active, starts_at, ends_at);

alter table public.announcements enable row level security;

-- Oznámení se načítají pouze přes serverové API. Přímý přístup z prohlížeče
-- zůstává záměrně zakázaný a administrativní zápisy vždy ověřují roli admina.
revoke all on table public.announcements from anon, authenticated;
grant all on table public.announcements to postgres, service_role;
