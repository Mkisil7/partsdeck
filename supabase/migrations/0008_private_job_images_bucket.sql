-- Make job-sheet / transfer-sheet photos private. Reads now require a
-- signed URL generated server-side for the owner.
update storage.buckets set public = false where id = 'job-images';

-- Owners can read their own objects (needed for createSignedUrl under RLS).
create policy "job_images_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'job-images' and owner = auth.uid());
