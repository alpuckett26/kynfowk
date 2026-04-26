-- M17 — profile enrichment for family_memberships
-- Adds richer per-member fields surfaced on the native member detail screen
-- and Me → Profile screen. All nullable, all backwards compatible — existing
-- code keeps working without referencing the new columns.

alter table public.family_memberships
  add column if not exists birthday          date,
  add column if not exists nickname          text,
  add column if not exists bio               text,
  add column if not exists favorite_food     text,
  add column if not exists faith_notes       text,
  add column if not exists prayer_intentions text,
  add column if not exists pronouns          text,
  add column if not exists hometown          text;

-- Index birthdays so the dashboard can surface "Birthdays this month" cheaply
-- without scanning the whole table. Functional index on month/day.
create index if not exists family_memberships_birthday_month_day_idx
  on public.family_memberships
     ((extract(month from birthday)), (extract(day from birthday)))
  where birthday is not null;
