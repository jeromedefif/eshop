alter table public.profiles
  add column if not exists catalog_guide_version integer not null default 0;
