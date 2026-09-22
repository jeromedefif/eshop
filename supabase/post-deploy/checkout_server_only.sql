-- RELEASE GATE: apply only after /api/checkout and the new customer UI are deployed.
-- Old tabs must reload; customer writes now go through the atomic authenticated API.
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
drop policy if exists orders_legacy_insert on public.orders;
drop policy if exists items_legacy_insert on public.order_items;
-- Cart writes also move to the authenticated revision-checked server API.
revoke insert, update, delete on public.customer_carts from anon, authenticated;
