-- M62: Columns for App Store Server Notifications V2 reconciliation.
--
-- The webhook at /api/webhook/apple-app-store needs a stable key to find
-- the right Kynfowk user when Apple notifies us about a renewal,
-- cancellation, refund, or billing failure. Apple's `originalTransactionId`
-- never changes for the lifetime of a subscription (even across renewals
-- or upgrades within the same subscription group), so we save it on
-- verifyReceipt and look users up by it on every notification.
--
-- We also store the latest expires-at + the environment the receipt
-- came from so the webhook can sanity-check that an incoming sandbox
-- notification doesn't accidentally reconcile a production user.

alter table public.profiles
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_expires_at timestamptz,
  add column if not exists apple_environment text;

create index if not exists profiles_apple_original_transaction_idx
  on public.profiles (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
