/**
 * mobile/lib/admob-init.ts
 *
 * One-shot AdMob bootstrapper. Call from the root layout on app boot.
 *
 * iOS sequence is non-negotiable:
 *   1. Show the App Tracking Transparency prompt FIRST. Apple requires
 *      this before any tracking-capable SDK initializes.
 *   2. Initialize Google Mobile Ads with the user's tracking choice.
 *      If they declined ATT, AdMob serves non-personalized ads.
 *   3. Set request configuration (max ad content rating, tag-for-COPPA
 *      flag, child-directed treatment). Kynfowk is family-themed but
 *      not child-directed.
 *
 * Idempotent — calling more than once is a no-op.
 *
 * Returns silently when AdMob app ID isn't configured (pre-AdMob-
 * approval) so the app boots cleanly without ads.
 */

import { Platform } from "react-native";

import { getAdMobAppId } from "@/lib/admob";

let initialized = false;

export async function initializeAdMob(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const appId = getAdMobAppId();
  if (!appId) {
    // Pre-approval: AdMob not configured. Do nothing; AdBanner will
    // also no-op until env vars land.
    return;
  }

  // Dynamic import so we don't pay the bundle cost when AdMob isn't
  // configured AND we don't crash on Android-only metadata access
  // when running on web (which never imports this module anyway).
  let mobileAds: typeof import("react-native-google-mobile-ads").default | null = null;
  let MaxAdContentRating: typeof import("react-native-google-mobile-ads").MaxAdContentRating | null = null;
  try {
    const mod = await import("react-native-google-mobile-ads");
    mobileAds = mod.default;
    MaxAdContentRating = mod.MaxAdContentRating;
  } catch (err) {
    console.warn("[admob-init] react-native-google-mobile-ads unavailable", err);
    return;
  }

  // ATT prompt — iOS only. expo-tracking-transparency lazy-imported
  // to keep Android boot fast and to avoid breaking if the package
  // isn't installed yet on a particular environment.
  if (Platform.OS === "ios") {
    try {
      const trackingMod = await import("expo-tracking-transparency");
      const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } =
        trackingMod;
      const current = await getTrackingPermissionsAsync();
      if (current.status === "undetermined") {
        await requestTrackingPermissionsAsync();
      }
    } catch (err) {
      // If expo-tracking-transparency isn't installed yet (separate
      // future PR), proceed without the prompt. AdMob will default
      // to non-personalized.
      console.warn("[admob-init] tracking transparency unavailable", err);
    }
  }

  try {
    await mobileAds().initialize();
    if (MaxAdContentRating) {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
    }
  } catch (err) {
    console.warn("[admob-init] initialize failed", err);
  }
}
