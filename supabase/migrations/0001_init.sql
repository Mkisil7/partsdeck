-- PartsDeck initial schema
-- Tables: jobs, parts, transfer_requests, user_settings
-- RLS enabled with per-user ownership policies.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_number text not null,
  customer_name text not null,
  job_date date not null,
  technician_name text,
  truck_id text,
  notes text,
  status text not null default 'open' check (status in ('open', 'completed', 'transferred')),
  image_url text,
  parsed_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- parts
-- ---------------------------------------------------------------------------
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  part_number text,
  part_name text not null,
  quantity integer not null default 1,
  unit text not null default 'each',
  category text check (category in ('electrical', 'mechanical', 'hardware', 'fluids', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists parts_job_id_idx on public.parts (job_id);
create index if not exists parts_category_idx on public.parts (category);

-- ---------------------------------------------------------------------------
-- transfer_requests
-- ---------------------------------------------------------------------------
create table if not exists public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  requested_by text,
  warehouse_email text not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'fulfilled')),
  created_at timestamptz not null default now()
);

create index if not exists transfer_requests_job_id_idx on public.transfer_requests (job_id);

-- ---------------------------------------------------------------------------
-- user_settings (default warehouse email, technician, truck)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  warehouse_email text,
  technician_name text,
  truck_id text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.parts enable row level security;
alter table public.transfer_requests enable row level security;
alter table public.user_settings enable row level security;

-- jobs: owner-scoped
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);

-- parts: scoped via parent job ownership
create policy "parts_select_own" on public.parts
  for select using (
    exists (select 1 from public.jobs j where j.id = parts.job_id and j.user_id = auth.uid())
  );
create policy "parts_insert_own" on public.parts
  for insert with check (
    exists (select 1 from public.jobs j where j.id = parts.job_id and j.user_id = auth.uid())
  );
create policy "parts_update_own" on public.parts
  for update using (
    exists (select 1 from public.jobs j where j.id = parts.job_id and j.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.jobs j where j.id = parts.job_id and j.user_id = auth.uid())
  );
create policy "parts_delete_own" on public.parts
  for delete using (
    exists (select 1 from public.jobs j where j.id = parts.job_id and j.user_id = auth.uid())
  );

-- transfer_requests: scoped via parent job ownership
create policy "transfers_select_own" on public.transfer_requests
  for select using (
    exists (select 1 from public.jobs j where j.id = transfer_requests.job_id and j.user_id = auth.uid())
  );
create policy "transfers_insert_own" on public.transfer_requests
  for insert with check (
    exists (select 1 from public.jobs j where j.id = transfer_requests.job_id and j.user_id = auth.uid())
  );
create policy "transfers_update_own" on public.transfer_requests
  for update using (
    exists (select 1 from public.jobs j where j.id = transfer_requests.job_id and j.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.jobs j where j.id = transfer_requests.job_id and j.user_id = auth.uid())
  );

-- user_settings: owner-scoped
create policy "settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for job sheet images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('job-images', 'job-images', true)
on conflict (id) do nothing;

create policy "job_images_read" on storage.objects
  for select using (bucket_id = 'job-images');
create policy "job_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-images' and owner = auth.uid());
create policy "job_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'job-images' and owner = auth.uid());
create policy "job_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-images' and owner = auth.uid());
