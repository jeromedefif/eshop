create table if not exists public.announcement_products (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, product_id)
);

create index if not exists announcement_products_product_id_idx
  on public.announcement_products (product_id);

insert into public.announcement_products (announcement_id, product_id)
select id, target_product_id
from public.announcements
where target_product_id is not null
on conflict (announcement_id, product_id) do nothing;

alter table public.announcement_products enable row level security;

-- Vazby se používají pouze přes serverová API, která ověřují administrátora.
revoke all on table public.announcement_products from anon, authenticated;
grant all on table public.announcement_products to postgres, service_role;
