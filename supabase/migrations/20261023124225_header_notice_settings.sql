-- Additive, independent from catalog announcements and ordering data.
BEGIN;
CREATE TABLE public.header_notice_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  messages jsonb NOT NULL CHECK (jsonb_typeof(messages) = 'array' AND jsonb_array_length(messages) <= 3),
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.header_notice_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.header_notice_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.header_notice_settings TO service_role;
-- No browser policies: writes only through the server API after requireAdmin().
INSERT INTO public.header_notice_settings (messages) VALUES (
  '[{"text":"Objednávky pro rozvozy nejpozději: **v úterý do 13:00**","enabled":true,"startsAt":null,"endsAt":null}]'::jsonb
);
COMMIT;
