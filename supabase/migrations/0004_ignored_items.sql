-- Shared "ignore list": line items that appear on work orders but should never
-- enter the parts tracker (fees, permits, yard signs, stickers, etc.).
-- During OCR/speech intake, any parsed line whose SKU or name matches an entry
-- here is dropped before the preview. Shared across all authenticated users.

create table if not exists public.ignored_items (
  id uuid primary key default gen_random_uuid(),
  sku text,
  part_name text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- must identify the line by at least one of SKU or name
  constraint ignored_items_has_key check (
    coalesce(nullif(trim(sku), ''), nullif(trim(part_name), '')) is not null
  )
);

-- Case-insensitive uniqueness, only enforced when the field is present.
create unique index if not exists ignored_items_sku_uniq
  on public.ignored_items (lower(sku))
  where sku is not null and sku <> '';
create unique index if not exists ignored_items_name_uniq
  on public.ignored_items (lower(part_name))
  where part_name is not null and part_name <> '';

alter table public.ignored_items enable row level security;

-- Shared list: any signed-in user can read and maintain it.
create policy "ignored_items_select_auth" on public.ignored_items
  for select to authenticated using (true);
create policy "ignored_items_insert_auth" on public.ignored_items
  for insert to authenticated with check (true);
create policy "ignored_items_delete_auth" on public.ignored_items
  for delete to authenticated using (true);

-- Seed with the known non-inventory line items.
insert into public.ignored_items (sku, part_name) values
  ('CON', 'Connection-Activation Fee'),
  ('EPERMIT', 'Municipal Electrical / Decal Permit'),
  ('884007-06', 'ADT Yard Sign'),
  ('D8329UE00', 'ADT Window Stickers (Pack of 4)')
on conflict do nothing;
