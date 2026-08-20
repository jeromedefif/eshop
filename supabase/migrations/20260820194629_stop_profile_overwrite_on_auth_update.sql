-- Profiles are the canonical source for editable customer data.
-- Updating auth.users also happens during sign-in (last_sign_in_at). The old
-- trigger copied stale registration metadata back into public.profiles on
-- every such update, effectively undoing customer profile edits.
drop trigger if exists on_auth_user_updated on auth.users;
