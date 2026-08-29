-- Additive customer purchasing features. Existing products, orders and profiles
-- are intentionally untouched so this migration is safe to apply before UI rollout.

create table public.favorite_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index favorite_products_product_id_idx
  on public.favorite_products (product_id);

create table public.saved_order_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_order_templates_name_length
    check (char_length(btrim(name)) between 1 and 80),
  unique (id, user_id)
);

create unique index saved_order_templates_user_name_idx
  on public.saved_order_templates (user_id, lower(btrim(name)));

create index saved_order_templates_user_updated_idx
  on public.saved_order_templates (user_id, updated_at desc);

create table public.saved_order_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  volume text not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint saved_order_template_items_quantity_positive check (quantity > 0),
  constraint saved_order_template_items_volume_present check (char_length(btrim(volume)) > 0),
  constraint saved_order_template_items_template_owner_fkey
    foreign key (template_id, user_id)
    references public.saved_order_templates (id, user_id)
    on delete cascade,
  unique (template_id, product_id, volume)
);

create index saved_order_template_items_user_idx
  on public.saved_order_template_items (user_id);

create index saved_order_template_items_product_idx
  on public.saved_order_template_items (product_id);

create table public.customer_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint customer_carts_items_object check (jsonb_typeof(items) = 'object')
);

alter table public.favorite_products enable row level security;
alter table public.saved_order_templates enable row level security;
alter table public.saved_order_template_items enable row level security;
alter table public.customer_carts enable row level security;

revoke all on table public.favorite_products from anon, authenticated;
revoke all on table public.saved_order_templates from anon, authenticated;
revoke all on table public.saved_order_template_items from anon, authenticated;
revoke all on table public.customer_carts from anon, authenticated;

grant select, insert, delete on table public.favorite_products to authenticated;
grant select, insert, update, delete on table public.saved_order_templates to authenticated;
grant select, insert, update, delete on table public.saved_order_template_items to authenticated;
grant select, insert, update, delete on table public.customer_carts to authenticated;

create policy "Customers can view their favorite products"
  on public.favorite_products for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can add their favorite products"
  on public.favorite_products for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Customers can remove their favorite products"
  on public.favorite_products for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can view their order templates"
  on public.saved_order_templates for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can create their order templates"
  on public.saved_order_templates for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Customers can update their order templates"
  on public.saved_order_templates for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Customers can delete their order templates"
  on public.saved_order_templates for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can view their order template items"
  on public.saved_order_template_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can create their order template items"
  on public.saved_order_template_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Customers can update their order template items"
  on public.saved_order_template_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Customers can delete their order template items"
  on public.saved_order_template_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can view their active cart"
  on public.customer_carts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can create their active cart"
  on public.customer_carts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Customers can update their active cart"
  on public.customer_carts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Customers can delete their active cart"
  on public.customer_carts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
