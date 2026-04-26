-- M24 — children / managed profiles
-- Lets a parent or guardian author a profile for a minor that doesn't have
-- their own auth identity. Distinct from is_placeholder (which is purely
-- a stub for someone who exists but isn't on the app yet).

alter table public.family_memberships
  add column if not exists managed_by_membership_id uuid
    references public.family_memberships(id) on delete set null,
  add column if not exists is_minor boolean not null default false;

create index if not exists family_memberships_managed_by_idx
  on public.family_memberships (managed_by_membership_id)
  where managed_by_membership_id is not null;
