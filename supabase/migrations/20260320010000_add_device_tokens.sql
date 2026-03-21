-- device_tokens
-- One row per physical device. Upserted on every app launch.
-- Used by Edge Functions / backend to send targeted native push notifications.

create table if not exists public.device_tokens (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  -- "ios" | "android" | "web"
  platform              text        not null check (platform in ('ios', 'android', 'web')),
  -- APNs device token (iOS) or FCM registration token (Android/web)
  token                 text        not null,
  app_version           text,
  device_name           text,
  notifications_enabled boolean     not null default true,
  last_seen_at          timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- One row per token — covers the case where a user signs out and a new
-- user signs in on the same device (upsert overwrites user_id).
create unique index if not exists device_tokens_token_idx
  on public.device_tokens (token);

-- Fast lookup when sending notifications to a specific user.
create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);

-- Fast lookup for active (enabled) tokens per user.
create index if not exists device_tokens_user_enabled_idx
  on public.device_tokens (user_id, notifications_enabled)
  where notifications_enabled = true;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.device_tokens enable row level security;

-- Users can manage only their own tokens (register, delete, disable).
create policy "device_tokens_self"
  on public.device_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role bypasses RLS automatically — Edge Functions that send
-- notifications query all tokens without needing an extra policy.
