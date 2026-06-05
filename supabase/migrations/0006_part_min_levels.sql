-- PartsDeck: per-user minimum stock levels for low-stock alerts.
-- A tech sets a minimum quantity they want to keep on hand for a given part.
-- When computed on-hand (received - used) drops below the minimum, the part
-- is flagged as low stock on the dashboard and inventory views.
--
-- Strictly owner-scoped: a user only ever sees their own thresholds.
-- part_key is the stable match key (lowercased SKU, or name when no SKU),
-- matching lib/buckets.ts partMatchKey() so a threshold lines up with the
-- on-hand row it governs.

create table if not exists public.part_min_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  part_key text not null,
  sku text,
  part_name text not null,
  min_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, part_key)
);

create index if not exists part_min_levels_user_id_idx on public.part_min_levels (user_id);

alter table public.part_min_levels enable row level security;

create policy "min_levels_select_own" on public.part_min_levels
  for select using (auth.uid() = user_id);
create policy "min_levels_insert_own" on public.part_min_levels
  for insert with check (auth.uid() = user_id);
create policy "min_levels_update_own" on public.part_min_levels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "min_levels_delete_own" on public.part_min_levels
  for delete using (auth.uid() = user_id);
