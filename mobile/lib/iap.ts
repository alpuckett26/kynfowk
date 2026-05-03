/**
 * mobile/lib/iap.ts
 *
 * Thin wrapper over react-native-iap for the Kynfowk Plus subscription.
 *
 * Lifecycle:
 *   1. App boot — call `ensureIapConnection()` once. Idempotent.
 *   2. Settings / Earn — `fetchPlusProducts()` returns the localized
 *      price/title for the products configured in App Store Connect.
 *   3. Purchase tap — `purchasePlus(productId)` opens the StoreKit
 *      sheet, awaits the user's confirmation, returns the resolved
 *      purchase. The `purchaseUpdatedListener` set up in
 *      `ensureIapConnection()` automatically POSTs the receipt to
 *      our server and finishes the transaction once accepted.
 *   4. Restore — `restorePurchases()` for users who reinstalled.
 *
 * Apple StoreKit error codes are noisy; we collapse common cancellations
 * into a typed `IapResult` so callers can render friendly messages.
 *
 * iOS-only by design. Android Plus subscriptions land in a separate
 * PR (Google Play Billing has different ergonomics).
 */

import { Platform } from "react-native";
import * as RNIap from "react-native-iap";

import { apiFetch } from "@/lib/api";

export const PLUS_MONTHLY_ID =
  process.env.EXPO_PUBLIC_IAP_PLUS_MONTHLY_PRODUCT_ID ?? "kynfowk.plus.monthly";
export const PLUS_YEARLY_ID =
  process.env.EXPO_PUBLIC_IAP_PLUS_YEARLY_PRODUCT_ID ?? "kynfowk.plus.yearly";

const PRODUCT_IDS = [PLUS_MONTHLY_ID, PLUS_YEARLY_ID];

export type IapResult =
  | { ok: true; productId: string; environment: "Production" | "Sandbox"; expiresAt: string }
  | { ok: false; reason: "cancelled" | "pending" | "ineligible" | "network" | "other"; message?: string };

let connected = false;
let purchaseUpdateSubscription: RNIap.EmitterSubscription | null = null;
let purchaseErrorSubscription: RNIap.EmitterSubscription | null = null;

/**
 * Initialize the StoreKit connection + the purchase listener. Safe to
 * call repeatedly — only the first call does work.
 */
export async function ensureIapConnection(): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (connected) return;
  await RNIap.initConnection();
  connected = true;

  // Listener fires every time a purchase reaches purchased state —
  // including replays after app reinstall, so this is also our
  // restore-purchase handler.
  purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
    const receiptData = (purchase as RNIap.SubscriptionPurchase).transactionReceipt;
    if (!receiptData) return;
    try {
      await apiFetch("/api/native/iap/apple-receipt", {
        method: "POST",
        body: { receiptData, productId: purchase.productId },
      });
      // Server validated + flipped is_paid_tier — finalize the
      // transaction so Apple stops re-broadcasting it.
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } catch (err) {
      // Don't finishTransaction on server failure; Apple will replay
      // the purchase next launch and we'll retry.
      console.warn("[iap] receipt POST failed; will retry on next launch", err);
    }
  });

  purchaseErrorSubscription = RNIap.purchaseErrorListener((err) => {
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
  if (connected) {
    await RNIap.endConnection();
    connected = false;
  }
}

/**
 * Look up the localized product details (price string, period, etc.)
 * for the Kynfowk Plus subscription. Returns [] if products aren't
 * configured in App Store Connect yet, or if running on Android.
 */
export async function fetchPlusProducts(): Promise<RNIap.Subscription[]> {
  if (Platform.OS !== "ios") return [];
  await ensureIapConnection();
  try {
    return await RNIap.getSubscriptions({ skus: PRODUCT_IDS });
  } catch (err) {
    console.warn("[iap] fetchPlusProducts failed", err);
    return [];
  }
}

/**
 * Open the StoreKit purchase sheet. Resolves once the user has
 * confirmed or cancelled. The actual entitlement flip happens inside
 * the purchaseUpdatedListener (server validation → DB write).
 */
export async function purchasePlus(productId: string): Promise<IapResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "ineligible", message: "iOS subscriptions only on this build." };
  }
  await ensureIapConnection();
  try {
    await RNIap.requestSubscription({ sku: productId });
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
  // getAvailablePurchases is the canonical call — react-native-iap
  // routes its results through purchaseUpdatedListener.
  await RNIap.getAvailablePurchases();
}
