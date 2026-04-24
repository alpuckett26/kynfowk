-- ============================================================
-- Kynfowk – Phone numbers + invite flow
-- Migration: 006_phone_and_invites
-- ============================================================
-- Adds phone column to family_members, relaxes email to optional
-- (so members can be invited by phone alone), and rewires the
-- signup trigger so a pre-existing invite (a family_member row
-- with matching email and no user_id yet) is claimed at signup
-- instead of creating a brand-new family for the user.

-- ─── Phone column ─────────────────────────────────────────────
alter table family_members
  add column if not exists phone text;

create index if not exists idx_family_members_phone
  on family_members(phone)
  where phone is not null;

-- ─── Make email optional, require email-or-phone ──────────────
alter table family_members
  alter column email drop not null;

-- Drop the existing unique constraint on email so we can re-add a
-- partial unique that ignores NULLs cleanly (Postgres treats NULLs
-- as distinct in unique constraints by default, but we want to be
-- explicit and avoid duplicate "" being allowed if anyone sends ""
-- at insert time).
alter table family_members
  drop constraint if exists family_members_email_key;

create unique index if not exists family_members_email_unique
  on family_members(lower(email))
  where email is not null and email <> '';

-- A member must have at least one contact method.
alter table family_members
  drop constraint if exists family_members_contact_present;
alter table family_members
  add constraint family_members_contact_present
  check (
    (email is not null and email <> '')
    or (phone is not null and phone <> '')
  );

-- ─── Updated signup trigger ───────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  user_email    text;
  display       text;
begin
  user_email := new.email;
  display    := coalesce(split_part(user_email, '@', 1), 'You');

  -- Already linked (e.g. retry path)? Nothing to do.
  if exists (select 1 from family_members where user_id = new.id) then
    return new;
  end if;

  -- Pre-existing invite for this email? Claim it.
  if user_email is not null then
    update family_members
    set user_id = new.id
    where lower(email) = lower(user_email) and user_id is null;

    if found then
      return new;
    end if;
  end if;

  -- No invite — first-time signup creates a new family.
  insert into families (name)
  values (display || '''s Family')
  returning id into new_family_id;

  insert into family_members (family_id, user_id, display_name, email)
  values (new_family_id, new.id, display, user_email);

  return new;
end;
$$;

-- ─── INSERT policy: members can invite to their own family ────
create policy "members invite new family members" on family_members
  for insert
  with check (family_id = current_family_id());
