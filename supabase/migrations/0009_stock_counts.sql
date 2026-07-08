-- Persisted physical inventory counts ("what I actually have"), one row per
-- user + part. The ledger (received - used) is what the company thinks the
-- tech has; this table records what the tech counted, and when.
create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  part_key text not null,
  sku text,
  part_name text not null,
  counted_qty integer not null,
  counted_at timestamptz not null default now(),
  unique (user_id, part_key)
);

create index if not exists stock_counts_user_id_idx on public.stock_counts (user_id);

alter table public.stock_counts enable row level security;

create policy "stock_counts_select_own" on public.stock_counts
  for select using (auth.uid() = user_id);
create policy "stock_counts_insert_own" on public.stock_counts
  for insert with check (auth.uid() = user_id);
create policy "stock_counts_update_own" on public.stock_counts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stock_counts_delete_own" on public.stock_counts
  for delete using (auth.uid() = user_id);
