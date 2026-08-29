create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  billing_address_value text := coalesce(nullif(new.raw_user_meta_data->>'billing_address', ''), nullif(new.raw_user_meta_data->>'address', ''));
  billing_city_value text := coalesce(nullif(new.raw_user_meta_data->>'billing_city', ''), nullif(new.raw_user_meta_data->>'city', ''));
  billing_postal_code_value text := coalesce(nullif(new.raw_user_meta_data->>'billing_postal_code', ''), nullif(new.raw_user_meta_data->>'postal_code', ''));
  billing_country_value text := coalesce(nullif(new.raw_user_meta_data->>'billing_country', ''), 'Česká republika');
  shipping_same boolean := coalesce(lower(new.raw_user_meta_data->>'shipping_same_as_billing') = 'true', true);
begin
  insert into public.profiles (
    id, email, full_name, company, phone, address, city, postal_code,
    company_id, vat_id, billing_address, billing_city, billing_postal_code, billing_country,
    shipping_same_as_billing, shipping_company, shipping_contact_name, shipping_address,
    shipping_city, shipping_postal_code, shipping_country, delivery_instructions,
    show_ordering_help, is_admin
  ) values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'company', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    billing_address_value,
    billing_city_value,
    billing_postal_code_value,
    nullif(new.raw_user_meta_data->>'company_id', ''),
    nullif(new.raw_user_meta_data->>'vat_id', ''),
    billing_address_value,
    billing_city_value,
    billing_postal_code_value,
    billing_country_value,
    shipping_same,
    coalesce(nullif(new.raw_user_meta_data->>'shipping_company', ''), nullif(new.raw_user_meta_data->>'company', '')),
    coalesce(nullif(new.raw_user_meta_data->>'shipping_contact_name', ''), nullif(new.raw_user_meta_data->>'full_name', '')),
    coalesce(nullif(new.raw_user_meta_data->>'shipping_address', ''), billing_address_value),
    coalesce(nullif(new.raw_user_meta_data->>'shipping_city', ''), billing_city_value),
    coalesce(nullif(new.raw_user_meta_data->>'shipping_postal_code', ''), billing_postal_code_value),
    coalesce(nullif(new.raw_user_meta_data->>'shipping_country', ''), billing_country_value),
    nullif(new.raw_user_meta_data->>'delivery_instructions', ''),
    true,
    false
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    company = excluded.company,
    phone = excluded.phone,
    address = excluded.address,
    city = excluded.city,
    postal_code = excluded.postal_code,
    company_id = excluded.company_id,
    vat_id = excluded.vat_id,
    billing_address = excluded.billing_address,
    billing_city = excluded.billing_city,
    billing_postal_code = excluded.billing_postal_code,
    billing_country = excluded.billing_country,
    shipping_same_as_billing = excluded.shipping_same_as_billing,
    shipping_company = excluded.shipping_company,
    shipping_contact_name = excluded.shipping_contact_name,
    shipping_address = excluded.shipping_address,
    shipping_city = excluded.shipping_city,
    shipping_postal_code = excluded.shipping_postal_code,
    shipping_country = excluded.shipping_country,
    delivery_instructions = excluded.delivery_instructions;

  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
