create index if not exists notification_deliveries_status_channel_created_at_idx
  on public.notification_deliveries (status, channel, created_at desc);

create index if not exists push_subscriptions_user_last_seen_at_idx
  on public.push_subscriptions (user_id, last_seen_at desc);
