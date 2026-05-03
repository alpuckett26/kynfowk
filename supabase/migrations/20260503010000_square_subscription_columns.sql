-- M61 — Square subscription state columns on profiles.
--
-- The web Plus checkout flow (lib/square.ts + /api/upgrade/square-subscribe)
-- creates a Square Customer + Subscription per upgrading user. We store
-- the IDs so the webhook (/api/webhook/square) can map an incoming
-- subscription.* event back to the right Kynfowk profile and reconcile
-- is_paid_tier on cancellation, payment failure, etc.
--
-- These columns are write-only from the server (service-role); RLS
-- prevents users from reading or modifying their own Square IDs to
-- avoid leaking PII or letting a user impersonate someone else's
-- subscription.

alter table public.profiles
  add column if not exists square_customer_id text,
  add column if not exists square_subscription_id text;

create index if not exists profiles_square_customer_idx
  on public.profiles (square_customer_id)
  where square_customer_id is not null;

create index if not exists profiles_square_subscription_idx
  on public.profiles (square_subscription_id)
  where square_subscription_id is not null;
