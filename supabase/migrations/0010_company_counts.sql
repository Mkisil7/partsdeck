-- Manual per-part override of the "company thinks I have" figure. When a row
-- exists it replaces the derived ledger figure (received - used) for that
-- part; deleting the row reverts to the derived figure.
create table if not exists public.company_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  part_key text not null,
  sku text,
  part_name text not null,
  company_qty integer not null,
  set_at timestamptz not null default now(),
  unique (user_id, part_key)
);

create index if not exists company_counts_user_id_idx on public.company_counts (user_id);

alter table public.company_counts enable row level security;

create policy "company_counts_select_own" on public.company_counts
  for select using (auth.uid() = user_id);
create policy "company_counts_insert_own" on public.company_counts
  for insert with check (auth.uid() = user_id);
create policy "company_counts_update_own" on public.company_counts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_counts_delete_own" on public.company_counts
  for delete using (auth.uid() = user_id);
