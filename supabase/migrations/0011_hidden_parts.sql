-- Parts a tech removed from their On Hand list. Rows here are excluded from
-- the on-hand view; re-adding the part via search deletes the row.
create table if not exists public.hidden_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  part_key text not null,
  sku text,
  part_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, part_key)
);

create index if not exists hidden_parts_user_id_idx on public.hidden_parts (user_id);

alter table public.hidden_parts enable row level security;

create policy "hidden_parts_select_own" on public.hidden_parts
  for select using (auth.uid() = user_id);
create policy "hidden_parts_insert_own" on public.hidden_parts
  for insert with check (auth.uid() = user_id);
create policy "hidden_parts_update_own" on public.hidden_parts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hidden_parts_delete_own" on public.hidden_parts
  for delete using (auth.uid() = user_id);
