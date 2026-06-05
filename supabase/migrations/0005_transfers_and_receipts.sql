-- PartsDeck: tech-to-tech transfers + inventory receipts (Wednesday pickups)
-- Both tables are strictly owner-scoped: a user can only ever see their own
-- transfers and received inventory.

-- ---------------------------------------------------------------------------
-- transfers — a record of parts a tech sent to another tech (history log)
-- items: jsonb array of { part_number, part_name, quantity, unit }
-- ---------------------------------------------------------------------------
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_name text not null,
  recipient_email text,
  message text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transfers_user_id_idx on public.transfers (user_id);
create index if not exists transfers_created_at_idx on public.transfers (created_at desc);

-- ---------------------------------------------------------------------------
-- inventory_receipts — parts received on a Wednesday inventory pickup.
-- An additive ledger: we never subtract from it. On-hand is computed as
-- (sum of received) - (sum of used on jobs) at read time.
-- items: jsonb array of { part_number, part_name, quantity, unit }
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  received_date date not null,
  image_url text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_receipts_user_id_idx on public.inventory_receipts (user_id);
create index if not exists inventory_receipts_received_date_idx on public.inventory_receipts (received_date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-scoped
-- ---------------------------------------------------------------------------
alter table public.transfers enable row level security;
alter table public.inventory_receipts enable row level security;

create policy "transfers_select_own" on public.transfers
  for select using (auth.uid() = user_id);
create policy "transfers_insert_own" on public.transfers
  for insert with check (auth.uid() = user_id);
create policy "transfers_update_own" on public.transfers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transfers_delete_own" on public.transfers
  for delete using (auth.uid() = user_id);

create policy "receipts_select_own" on public.inventory_receipts
  for select using (auth.uid() = user_id);
create policy "receipts_insert_own" on public.inventory_receipts
  for insert with check (auth.uid() = user_id);
create policy "receipts_update_own" on public.inventory_receipts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receipts_delete_own" on public.inventory_receipts
  for delete using (auth.uid() = user_id);
