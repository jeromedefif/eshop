-- Product lifecycle and ordering options.
-- This migration is additive: it does not modify existing orders, order items or users.
-- Run it once in the Supabase SQL Editor before deploying the application code.

alter table public.products
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists is_new boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_priority integer not null default 0,
  add column if not exists min_order_qty integer not null default 1,
  add column if not exists allowed_volumes text[] not null default '{}';

do $$
begin
  alter table public.products
    add constraint products_min_order_qty_positive check (min_order_qty >= 1);
exception
  when duplicate_object then null;
end $$;

create index if not exists products_is_archived_idx
  on public.products (is_archived);

-- An empty allowed_volumes array means the existing category default applies.
-- This keeps all existing products orderable exactly as they were before this migration.
create or replace function public.validate_order_item_product()
returns trigger
language plpgsql
as $$
declare
  selected_product public.products%rowtype;
begin
  select * into selected_product
  from public.products
  where id = new.product_id;

  if not found then
    raise exception 'Produkt neexistuje.';
  end if;

  if selected_product.is_archived then
    raise exception 'Produkt je archivovaný a nelze jej objednat.';
  end if;

  if not selected_product.in_stock then
    raise exception 'Produkt není skladem.';
  end if;

  if new.quantity < selected_product.min_order_qty then
    raise exception 'Minimální odběr produktu je % ks.', selected_product.min_order_qty;
  end if;

  if coalesce(array_length(selected_product.allowed_volumes, 1), 0) > 0
     and not (new.volume = any(selected_product.allowed_volumes)) then
    raise exception 'Zvolený objem není pro tento produkt dostupný.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_order_item_product_trigger on public.order_items;

create trigger validate_order_item_product_trigger
before insert or update of product_id, volume, quantity on public.order_items
for each row execute function public.validate_order_item_product();
