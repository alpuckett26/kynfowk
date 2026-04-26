-- M14b — Storage RLS policy for the member-avatars bucket
-- The bucket was originally created via the Supabase dashboard with no SQL
-- policy committed to the repo. As a result, on any fresh project the
-- carousel photo / avatar uploads fail with "new row violates row-level
-- security policy" because storage.objects has RLS on by default and no
-- policy granting authenticated users INSERT access to this bucket.
--
-- This migration sets the policies explicitly:
--   - public read (anyone can fetch a photo URL)
--   - authenticated insert under any path within the bucket
--   - authenticated delete of files they uploaded (owner = auth.uid())

-- Make sure the bucket exists. (Idempotent — no-op if already there.)
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- Drop any prior versions of these policies before recreating, so this
-- migration is idempotent across re-runs.
drop policy if exists "member_avatars_public_read"   on storage.objects;
drop policy if exists "member_avatars_auth_insert"   on storage.objects;
drop policy if exists "member_avatars_owner_delete"  on storage.objects;

-- Anyone can read.
create policy "member_avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'member-avatars');

-- Any authenticated user can upload.
create policy "member_avatars_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'member-avatars');

-- Uploaders can delete their own files.
create policy "member_avatars_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'member-avatars'
    and owner = auth.uid()
  );
