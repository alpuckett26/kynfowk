-- M27 follow-up — relationship_kind_tiers seed backfill
-- The original M27 migration tries to seed this table inside a `do $$
-- exception when others` block, which silently swallows the
-- `unsafe_new_enum_value_usage` error Postgres raises when you reference
-- enum labels that haven't yet committed (the new labels are added by
-- `alter type add value` earlier in the same migration). The result was
-- an empty `relationship_kind_tiers` table on fresh applies, which made
-- the auto-scheduling engine fall back to the `distant` tier (90d) for
-- every relationship.
--
-- This follow-up migration runs in its own transaction — the new enum
-- values from M27 have committed by now — so the insert succeeds.
-- Idempotent via `on conflict do nothing` so re-applying is safe.

insert into public.relationship_kind_tiers (kind, tier) values
  ('parent','immediate'), ('child','immediate'),
  ('spouse','immediate'), ('partner','immediate'),
  ('sibling','close'), ('grandparent','close'), ('grandchild','close'),
  ('step_parent','close'), ('step_child','close'), ('in_law','close'),
  ('cousin','extended'), ('aunt','extended'), ('uncle','extended'),
  ('niece','extended'), ('nephew','extended'),
  ('great_grandparent','extended'), ('great_grandchild','extended'),
  ('other','distant'), ('ward','distant'), ('guardian','distant')
on conflict (kind) do nothing;
