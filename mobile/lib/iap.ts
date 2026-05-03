/**
 * mobile/lib/iap.ts
 *
 * Thin wrapper over expo-iap (v3.x) for the Kynfowk Plus subscription.
 *
 * expo-iap v3 changed several method names from the v2 / react-native-iap
 * shape. We wrap them so the rest of the app keeps a stable surface
 * (`fetchPlusProducts`, `purchasePlus`, `restorePurchases`) regardless
 * of how the underlying SDK evolves.
 *
 * Lifecycle:
 *   1. App boot — call `ensureIapConnection()` once. Idempotent.
 *   2. Settings — `fetchPlusProducts()` returns the localized
 *      price/title for the products configured in App Store Connect.
 *   3. Purchase tap — `purchasePlus(productId)` opens the StoreKit
 *      sheet, awaits the user's confirmation. The
 *      `purchaseUpdatedListener` set up in `ensureIapConnection()`
 *      automatically POSTs the receipt to our server and finishes the
 *      transaction once accepted.
 *   4. Restore — `restorePurchases()` for users who reinstalled.
 *
 * iOS-only by design. Android Plus subscriptions land in a separate
 * PR (Google Play Billing has different ergonomics).
 */

import { Platform } from "react-native";

import { apiFetch } from "@/lib/api";

export const PLUS_MONTHLY_ID =
  process.env.EXPO_PUBLIC_IAP_PLUS_MONTHLY_PRODUCT_ID ?? "kynfowk.plus.monthly";
export const PLUS_YEARLY_ID =
  process.env.EXPO_PUBLIC_IAP_PLUS_YEARLY_PRODUCT_ID ?? "kynfowk.plus.yearly";

const PRODUCT_IDS = [PLUS_MONTHLY_ID, PLUS_YEARLY_ID];

export type IapResult =
  | { ok: true; productId: string; environment: "Production" | "Sandbox"; expiresAt: string }
  | { ok: false; reason: "cancelled" | "pending" | "ineligible" | "network" | "other"; message?: string };

// expo-iap exports a moving target across versions. We type the
// surface we actually use loosely so a v3 → v4 rename doesn't break
// our build. Failures fall back to runtime warnings + null returns
// rather than module-init crashes.
type IapSubscription = { remove: () => void };
interface ExpoIapSurface {
  initConnection: () => Promise<unknown>;
  endConnection: () => Promise<unknown>;
  finishTransaction: (args: { purchase: unknown; isConsumable?: boolean }) => Promise<unknown>;
  purchaseUpdatedListener: (cb: (purchase: PurchasedItem) => void) => IapSubscription;
  purchaseErrorListener: (cb: (err: unknown) => void) => IapSubscription;
  getAvailablePurchases: () => Promise<unknown>;
  // v3 unified products + subscriptions under requestProducts({type})
  // and requestPurchase({type}). Falls back to v2 names if present.
  requestProducts?: (args: { skus: string[]; type?: "subs" | "inapp" }) => Promise<unknown[]>;
  getSubscriptions?: (args: { skus: string[] }) => Promise<unknown[]>;
  requestPurchase?: (args: unknown) => Promise<unknown>;
  requestSubscription?: (args: { sku: string }) => Promise<unknown>;
}

interface PurchasedItem {
  productId: string;
  transactionReceipt?: string;
  // v3 wraps the iOS-specific receipt in purchaseToken, ios.transactionReceipt,
  // or transactionReceipt. We try them all.
  purchaseToken?: string;
  ios?: { transactionReceipt?: string };
}

let cachedModule: ExpoIapSurface | null = null;

async function loadIap(): Promise<ExpoIapSurface | null> {
  if (cachedModule) return cachedModule;
  try {
    const mod = (await import("expo-iap")) as unknown as ExpoIapSurface;
    cachedModule = mod;
    return mod;
  } catch (err) {
    console.warn("[iap] expo-iap unavailable", err);
    return null;
  }
}

let connected = false;
let purchaseUpdateSubscription: IapSubscription | null = null;
let purchaseErrorSubscription: IapSubscription | null = null;

function extractReceipt(purchase: PurchasedItem): string | null {
  return (
    purchase.ios?.transactionReceipt ??
    purchase.transactionReceipt ??
    purchase.purchaseToken ??
    null
  );
}

/**
 * Initialize the StoreKit connection + the purchase listener. Safe to
 * call repeatedly — only the first call does work.
 */
export async function ensureIapConnection(): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (connected) return;
  const IAP = await loadIap();
  if (!IAP) return;
  await IAP.initConnection();
  connected = true;

  purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
    const receiptData = extractReceipt(purchase);
    if (!receiptData) return;
    try {
      await apiFetch("/api/native/iap/apple-receipt", {
        method: "POST",
        body: { receiptData, productId: purchase.productId },
      });
      await IAP.finishTransaction({ purchase, isConsumable: false });
    } catch (err) {
      // Don't finishTransaction on server failure; Apple replays the
      // purchase next launch and we'll retry then.
      console.warn("[iap] receipt POST failed; will retry on next launch", err);
    }
  });

  purchaseErrorSubscription = IAP.purchaseErrorListener((err) => {
    console.warn("[iap] purchase error:", err);
  });
}

/**
 * Tear down listeners on app shutdown / sign-out. Optional but tidy.
 */
export async function teardownIapConnection(): Promise<void> {
  if (Platform.OS !== "ios") return;
  purchaseUpdateSubscription?.remove();
  purchaseErrorSubscription?.remove();
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;
  if (connected && cachedModule) {
    await cachedModule.endConnection();
    connected = false;
  }
}

export interface PlusProduct {
  productId: string;
  localizedPrice?: string;
  price?: string;
  currency?: string;
  title?: string;
  description?: string;
}

/**
 * Look up the localized product details for the Kynfowk Plus
 * subscriptions. Tries v3's `requestProducts({ type: 'subs' })` first,
 * falls back to v2's `getSubscriptions` if the v3 entry isn't there.
 */
export async function fetchPlusProducts(): Promise<PlusProduct[]> {
  if (Platform.OS !== "ios") return [];
  await ensureIapConnection();
  const IAP = cachedModule;
  if (!IAP) return [];
  try {
    let raw: unknown[] = [];
    if (typeof IAP.requestProducts === "function") {
      raw = await IAP.requestProducts({ skus: PRODUCT_IDS, type: "subs" });
    } else if (typeof IAP.getSubscriptions === "function") {
      raw = await IAP.getSubscriptions({ skus: PRODUCT_IDS });
    }
    return raw as PlusProduct[];
  } catch (err) {
    console.warn("[iap] fetchPlusProducts failed", err);
    return [];
  }
}

/**
 * Open the StoreKit purchase sheet. Resolves once the user has
 * confirmed or cancelled. The entitlement flip happens inside the
 * purchaseUpdatedListener (server validation → DB write).
 */
export async function purchasePlus(productId: string): Promise<IapResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "ineligible", message: "iOS subscriptions only on this build." };
  }
  await ensureIapConnection();
  const IAP = cachedModule;
  if (!IAP) {
    return { ok: false, reason: "other", message: "Subscriptions module not available on this build." };
  }
  try {
    if (typeof IAP.requestPurchase === "function") {
      // expo-iap v3 shape: { request: { ios: { sku } }, type: 'subs' }
      await IAP.requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: "subs",
      });
    } else if (typeof IAP.requestSubscription === "function") {
      await IAP.requestSubscription({ sku: productId });
    } else {
      return { ok: false, reason: "other", message: "No supported purchase method on this expo-iap build." };
    }
    return {
      ok: true,
      productId,
      environment: __DEV__ ? "Sandbox" : "Production",
      // Real expiresAt comes from the server response inside the
      // purchaseUpdatedListener — caller should refresh profile state
      // after this resolves rather than trust the placeholder below.
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(message)) {
      return { ok: false, reason: "cancelled" };
    }
    if (/pending/i.test(message)) {
      return { ok: false, reason: "pending", message };
    }
    if (/network/i.test(message)) {
      return { ok: false, reason: "network", message };
    }
    return { ok: false, reason: "other", message };
  }
}

/**
 * Trigger a Restore Purchases flow. StoreKit will replay any active
 * subscriptions through the purchaseUpdatedListener, which re-validates
 * each receipt against the server and reflips is_paid_tier as needed.
 */
export async function restorePurchases(): Promise<void> {
  if (Platform.OS !== "ios") return;
  await ensureIapConnection();
  const IAP = cachedModule;
  if (!IAP) return;
  await IAP.getAvailablePurchases();
}
