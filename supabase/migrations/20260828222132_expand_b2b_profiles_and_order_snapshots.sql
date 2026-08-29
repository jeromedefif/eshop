-- Additive B2B profile fields. Existing columns remain in place for backwards compatibility.
alter table public.profiles
  add column if not exists company_id text,
  add column if not exists vat_id text,
  add column if not exists billing_address text,
  add column if not exists billing_city text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text default 'Česká republika',
  add column if not exists shipping_same_as_billing boolean not null default true,
  add column if not exists shipping_company text,
  add column if not exists shipping_contact_name text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text default 'Česká republika',
  add column if not exists delivery_instructions text,
  add column if not exists show_ordering_help boolean not null default true;

-- Preserve existing addresses by copying them to both new address sections.
update public.profiles
set
  billing_address = coalesce(billing_address, address),
  billing_city = coalesce(billing_city, city),
  billing_postal_code = coalesce(billing_postal_code, postal_code),
  billing_country = coalesce(nullif(billing_country, ''), 'Česká republika'),
  shipping_company = coalesce(shipping_company, company),
  shipping_contact_name = coalesce(shipping_contact_name, full_name),
  shipping_address = coalesce(shipping_address, address),
  shipping_city = coalesce(shipping_city, city),
  shipping_postal_code = coalesce(shipping_postal_code, postal_code),
  shipping_country = coalesce(nullif(shipping_country, ''), 'Česká republika')
where
  billing_address is null
  or billing_city is null
  or billing_postal_code is null
  or shipping_company is null
  or shipping_contact_name is null
  or shipping_address is null
  or shipping_city is null
  or shipping_postal_code is null;

-- Snapshot fields are nullable so historical orders remain unchanged and valid.
alter table public.orders
  add column if not exists customer_company_id text,
  add column if not exists customer_vat_id text,
  add column if not exists billing_address text,
  add column if not exists billing_city text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text,
  add column if not exists shipping_company text,
  add column if not exists shipping_contact_name text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text,
  add column if not exists delivery_instructions text;
