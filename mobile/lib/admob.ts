/**
 * mobile/lib/admob.ts
 *
 * Centralized AdMob configuration. Mirrors the web's `lib/ads.ts`
 * shape but with separate iOS / Android ad-unit IDs since AdMob
 * treats each platform as its own "app" in the dashboard.
 *
 * Vercel / EAS env vars (set after AdMob approves the apps):
 *
 *   EXPO_PUBLIC_ADMOB_IOS_APP_ID                "ca-app-pub-X~Y"
 *   EXPO_PUBLIC_ADMOB_ANDROID_APP_ID            "ca-app-pub-X~Y"
 *
 *   EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS           "ca-app-pub-X/Y"
 *   EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID       "ca-app-pub-X/Y"
 *   EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_IOS       "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_ANDROID   "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_FAMILY_IOS         "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_FAMILY_ANDROID     "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_INBOX_IOS          "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_INBOX_ANDROID      "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_ME_IOS             "..."
 *   EXPO_PUBLIC_ADMOB_BANNER_ME_ANDROID         "..."
 *
 * Until those are set, AdBanner falls back to AdMob's published TEST
 * unit IDs in development (so banners render locally without dropping
 * real-inventory impressions) or to null in production (no ad rendered).
 *
 * Production mode is detected via __DEV__ (false in EAS Build).
 */

import { Platform } from "react-native";

export type AdPlacement =
  | "home-tab"
  | "schedule-tab"
  | "family-tab"
  | "inbox-tab"
  | "me-tab";

// AdMob's published universal test unit IDs. Safe to use in dev —
// they always return test creative and never count toward inventory.
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";

export function getAdMobAppId(): string | null {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || null;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || null;
  }
  return null;
}

/**
 * Resolve the ad-unit ID for a given placement on the current platform.
 * Returns the test ID in dev when the env var isn't set; returns null
 * in production when unset (component renders null and no AdMob call
 * is made).
 */
export function getBannerUnitId(placement: AdPlacement): string | null {
  const envValue = readBannerEnv(placement);
  if (envValue) return envValue;
  if (__DEV__) {
    return Platform.OS === "ios" ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
  }
  return null;
}

function readBannerEnv(placement: AdPlacement): string | null {
  const isIos = Platform.OS === "ios";
  switch (placement) {
    case "home-tab":
      return (
        (isIos
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID) || null
      );
    case "schedule-tab":
      return (
        (isIos
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_ANDROID) || null
      );
    case "family-tab":
      return (
        (isIos
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_FAMILY_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_FAMILY_ANDROID) || null
      );
    case "inbox-tab":
      return (
        (isIos
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_INBOX_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_INBOX_ANDROID) || null
      );
    case "me-tab":
      return (
        (isIos
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ME_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_ME_ANDROID) || null
      );
    default:
      return null;
  }
}
