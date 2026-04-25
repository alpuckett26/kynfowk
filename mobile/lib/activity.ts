import { apiFetch } from "@/lib/api";
import type { ActivityFeedItem } from "@/types/api";

export function fetchActivity(limit = 50): Promise<{ items: ActivityFeedItem[] }> {
  return apiFetch(`/api/native/activity?limit=${limit}`);
}
