-- Master parts catalog (shared across all authenticated ADT users).
-- Maps SKU <-> part name so intake can auto-fill whichever side is missing.
-- Duplicate protection: SKU and name are each unique (case-insensitive).

create table if not exists public.master_parts (
  id uuid primary key default gen_random_uuid(),
  sku text,
  part_name text not null,
  category text check (category in ('electrical', 'mechanical', 'hardware', 'fluids', 'other')),
  unit text not null default 'each',
  notes text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness. SKU is optional, so only enforce when present.
create unique index if not exists master_parts_sku_uniq
  on public.master_parts (lower(sku))
  where sku is not null and sku <> '';
create unique index if not exists master_parts_name_uniq
  on public.master_parts (lower(part_name));

alter table public.master_parts enable row level security;

-- Shared catalog: any signed-in user can read and maintain it.
create policy "master_parts_select_auth" on public.master_parts
  for select to authenticated using (true);
create policy "master_parts_insert_auth" on public.master_parts
  for insert to authenticated with check (true);
create policy "master_parts_update_auth" on public.master_parts
  for update to authenticated using (true) with check (true);
create policy "master_parts_delete_auth" on public.master_parts
  for delete to authenticated using (true);
