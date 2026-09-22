-- Additive schema and security corrections. Compatible with the previous checkout.
-- Direct order inserts are removed separately, only after the new checkout is deployed.
alter table public.orders add column if not exists request_key uuid,
  add column if not exists request_hash text;
create unique index if not exists orders_user_id_request_key_key on public.orders(user_id, request_key);
alter table public.order_items add column if not exists product_name text,
  add column if not exists product_category text;
-- Do not invent historical snapshots: old rows retain NULL and use the legacy fallback.
create index if not exists orders_created_at_id_idx on public.orders(created_at desc, id);
create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dedupe_key text not null unique,
  recipient text not null,
  subject text not null,
  html text not null,
  status text not null default 'pending' check (status in ('pending','sending','failed','sent','review')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  first_attempt_at timestamptz,
  claim_token uuid,
  sent_at timestamptz,
  last_error text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index email_deliveries_status_next_attempt_at_idx on public.email_deliveries(status, next_attempt_at);
alter table public.email_deliveries enable row level security;
revoke all on public.email_deliveries from public, anon, authenticated;

-- Existing permissive policies are OR-ed; adding a restrictive-looking policy alone
-- would NOT remove the old unrestricted access.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname='public'
    and tablename in ('products','profiles','orders','order_items')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end $$;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.products, public.profiles, public.orders, public.order_items from public, anon, authenticated;
-- Revoke any old column grants too, particularly is_admin.
do $$
declare c record;
begin
 for c in select column_name from information_schema.columns where table_schema='public' and table_name='profiles'
 loop execute format('revoke all (%I) on public.profiles from public, anon, authenticated', c.column_name); end loop;
end $$;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant usage, select on sequence public.products_id_seq to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, company, phone, address, city, postal_code, company_id, vat_id,
 billing_address, billing_city, billing_postal_code, billing_country, shipping_same_as_billing,
 shipping_company, shipping_contact_name, shipping_address, shipping_city, shipping_postal_code,
 shipping_country, delivery_instructions, show_ordering_help, catalog_guide_version, updated_at)
 on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
 using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy products_public_read on public.products for select to anon using (not is_archived);
-- Logged-in customers also need archived product names for historical orders.
create policy products_customer_read on public.products for select to authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated
 with check (exists(select 1 from public.profiles where id=(select auth.uid()) and is_admin));
create policy products_admin_update on public.products for update to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and is_admin))
 with check (exists(select 1 from public.profiles where id=(select auth.uid()) and is_admin));
create policy products_admin_delete on public.products for delete to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and is_admin));
grant select, insert on public.orders, public.order_items to authenticated;
create policy orders_read_own on public.orders for select to authenticated using ((select auth.uid())=user_id);
create policy orders_legacy_insert on public.orders for insert to authenticated
 with check ((select auth.uid())=user_id and status='pending' and request_key is null and request_hash is null);
create policy items_read_own on public.order_items for select to authenticated
 using (exists(select 1 from public.orders where id=order_id and user_id=(select auth.uid())));
create policy items_legacy_insert on public.order_items for insert to authenticated
 with check (exists(select 1 from public.orders where id=order_id and user_id=(select auth.uid()) and status='pending' and request_key is null));

create or replace function public.validate_order_item_product()
returns trigger language plpgsql set search_path = '' as $$
declare p public.products%rowtype; volumes text[];
begin
 select * into p from public.products where id=new.product_id;
 if not found or p.is_archived or not p.in_stock then raise exception 'Produkt není dostupný.'; end if;
 if new.quantity < p.min_order_qty or new.quantity > 10000 then raise exception 'Neplatné množství.'; end if;
 volumes := p.allowed_volumes;
 if coalesce(array_length(volumes,1),0)=0 then
  volumes := case
   when p.category in ('Víno','Perlivé','Nápoje','Ovocné víno') then array['3','5','10','20','30','50']
   when p.category='Burčák' then array['3','5','10','20','25','50']
   when p.category in ('Plyny','Dusík') then array['maly','velky']
   when p.category='PET' then array['baleni'] else array[]::text[] end;
 end if;
 if p.category='Burčák' then volumes := array_append(array_replace(volumes,'30','25'),'25'); end if;
 if not (new.volume=any(volumes)) then raise exception 'Neplatný objem.'; end if;
 if TG_OP='INSERT' then new.product_name:=p.name; new.product_category:=p.category; end if;
 return new;
end $$;

alter table public.customer_carts add column if not exists revision integer not null default 0;
