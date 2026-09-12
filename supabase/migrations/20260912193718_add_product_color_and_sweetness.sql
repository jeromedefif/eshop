alter table public.products
    add column if not exists product_color text,
    add column if not exists sweetness text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'products_product_color_check'
          and conrelid = 'public.products'::regclass
    ) then
        alter table public.products
            add constraint products_product_color_check
            check (product_color is null or product_color in ('white', 'red', 'rose'));
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'products_sweetness_check'
          and conrelid = 'public.products'::regclass
    ) then
        alter table public.products
            add constraint products_sweetness_check
            check (sweetness is null or sweetness in ('dry', 'semi_dry', 'semi_sweet', 'sweet'));
    end if;
end
$$;

comment on column public.products.product_color is
    'Optional product color used for catalog filtering.';

comment on column public.products.sweetness is
    'Optional sweetness classification used for catalog filtering.';
