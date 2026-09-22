-- Run ONLY by setup-test-db against a fresh isolated local database.
-- Check the old browser checkout between the additive migration and release gate.
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000001');
INSERT INTO public.profiles(id,full_name,email) VALUES ('00000000-0000-4000-8000-000000000001','Legacy test','legacy@example.invalid');
INSERT INTO public.products(id,name,category) VALUES (9223372036854775806,'Legacy wine','Víno');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
INSERT INTO public.orders(id,user_id,customer_name,customer_email,total_volume)
VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Legacy test','legacy@example.invalid',10);
INSERT INTO public.order_items(id,order_id,product_id,quantity,volume)
VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',9223372036854775806,1,'10');
UPDATE public.profiles SET full_name='Updated legacy test' WHERE id='00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE product_name='Legacy wine') THEN
  RAISE EXCEPTION 'Legacy checkout snapshot was not written';
 END IF;
END $$;
ROLLBACK;
