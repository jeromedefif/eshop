-- Internal administrative notes for orders.
-- This is additive and does not change existing orders, history or customer data.
-- Run once in the Supabase SQL Editor before deploying the application code.

create table if not exists public.order_internal_notes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_internal_notes_note_length check (char_length(note) <= 5000)
);

-- No customer-facing API or RLS policy may read this table. The application accesses
-- it only from a server route after verifying the current user is an administrator.
alter table public.order_internal_notes enable row level security;
revoke all on table public.order_internal_notes from anon, authenticated;
