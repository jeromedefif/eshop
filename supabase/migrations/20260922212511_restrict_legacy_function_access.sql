-- Legacy RPCs are not referenced by the application. Keep definitions for
-- privileged maintenance, but prevent Data API callers from bypassing RLS.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
do $$
declare signature text;
begin
 foreach signature in array array[
  'public.create_volume_function()',
  'public.get_total_volume_for_user(uuid)',
  'public.handle_new_user_profile()'
 ] loop
  if to_regprocedure(signature) is not null then
   execute format('revoke execute on function %s from public, anon, authenticated', signature);
  end if;
 end loop;
 foreach signature in array array[
  'public.create_volume_function()',
  'public.get_total_volume_for_user(uuid)',
  'public.handle_new_user_profile()',
  'public.update_updated_at_column()',
  'public.handle_updated_at()',
  'public.update_updated_at()'
 ] loop
  if to_regprocedure(signature) is not null then
   execute format('alter function %s set search_path = pg_catalog, public, pg_temp', signature);
  end if;
 end loop;
end $$;
notify pgrst, 'reload schema';
