/**
 * mobile/lib/billing.ts
 *
 * Lightweight client-side cache of the viewer's paid-tier status. The
 * AdBanner / AdInterstitial components read it to decide whether to
 * render an ad. Mirrors the web's `lib/billing.ts` shape so the
 * /api/native/profile/billing endpoint can return its raw payload.
 *
 * Cache lives in module memory + AsyncStorage. We refresh on every
 * call but return the cached value optimistically so the UI doesn't
 * flash the ad placeholder while the network request is in flight.
 *
 * After a successful Apple IAP purchase (M58), the
 * purchaseUpdatedListener should call refreshBilling() so the cache
 * flips immediately rather than waiting for the next mount.
 */

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch, ApiError } from "@/lib/api";

const STORAGE_KEY = "kynfowk_billing_v1";

export interface ViewerBilling {
  isPaidTier: boolean;
  subscriptionTier: "free" | "paid";
}

const DEFAULT_BILLING: ViewerBilling = {
  isPaidTier: false,
  subscriptionTier: "free",
};

let memCache: ViewerBilling | null = null;
const subscribers = new Set<(b: ViewerBilling) => void>();

function publish(next: ViewerBilling) {
  memCache = next;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  for (const fn of subscribers) fn(next);
}

/**
 * Pull the latest billing snapshot from the server and update the cache.
 * Safe to call without awaiting — listeners get the new value via
 * subscribe.
 */
export async function refreshBilling(): Promise<ViewerBilling> {
  try {
    const next = await apiFetch<ViewerBilling>("/api/native/profile/billing");
    publish(next);
    return next;
  } catch (err) {
    // On 401 (signed out) treat as free so ads still render.
    if (err instanceof ApiError && err.status === 401) {
      publish(DEFAULT_BILLING);
      return DEFAULT_BILLING;
    }
    // On network error, return the last known value rather than
    // flipping back to free; sticky cache is the friendlier failure mode.
    return memCache ?? DEFAULT_BILLING;
  }
}

async function loadFromStorage(): Promise<ViewerBilling> {
  if (memCache) return memCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ViewerBilling;
      memCache = parsed;
      return parsed;
    }
  } catch {
    /* fall through */
  }
  memCache = DEFAULT_BILLING;
  return DEFAULT_BILLING;
}

/**
 * React hook. Returns the cached billing snapshot synchronously and
 * triggers a background refresh on mount.
 */
export function useViewerBilling(): ViewerBilling {
  const [state, setState] = useState<ViewerBilling>(memCache ?? DEFAULT_BILLING);

  useEffect(() => {
    let cancelled = false;
    const onChange = (next: ViewerBilling) => {
      if (!cancelled) setState(next);
    };
    subscribers.add(onChange);

    void loadFromStorage().then((cached) => {
      if (!cancelled) setState(cached);
    });
    void refreshBilling();

    return () => {
      cancelled = true;
      subscribers.delete(onChange);
    };
  }, []);

  return state;
}
