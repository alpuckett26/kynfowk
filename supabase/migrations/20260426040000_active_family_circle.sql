-- M19 — multi-circle support
-- Adds an "active circle" pointer on profiles so members of multiple
-- family circles can switch between them in the native app. Fully
-- backwards compatible — when null, code falls back to "first circle"
-- (existing behavior).

alter table public.profiles
  add column if not exists active_family_circle_id uuid
    references public.family_circles(id) on delete set null;
