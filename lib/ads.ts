/**
 * lib/ads.ts
 *
 * Centralizes the AdSense publisher + slot configuration so the AdSlot
 * component can stay simple and the env-var contract is documented in
 * one place.
 *
 * Vercel env vars (set after AdSense approves the site). Every var is
 * NEXT_PUBLIC_ so it's inlined into the client bundle — AdSense reads
 * them at runtime in the browser. None of these are secrets.
 *
 *   NEXT_PUBLIC_ADSENSE_CLIENT_ID                "ca-pub-XXXXXXXXXXXXXXXX"
 *   NEXT_PUBLIC_ADSENSE_SLOT_CONNECT_PANEL       "1234567890"
 *   NEXT_PUBLIC_ADSENSE_SLOT_PLAN_PANEL          "1234567890"
 *   NEXT_PUBLIC_ADSENSE_SLOT_EARN_PANEL          "1234567890"
 *   NEXT_PUBLIC_ADSENSE_SLOT_FAMILY_PANEL        "1234567890"
 *   NEXT_PUBLIC_ADSENSE_SLOT_NOTIFICATIONS_FEED  "1234567890"
 *   NEXT_PUBLIC_ADSENSE_SLOT_POST_CALL           "1234567890"
 *
 * If the client ID is unset, every AdSlot falls back to the "Sponsored"
 * placeholder so dev / preview builds and pre-AdSense-approval prod
 * still render layout-stable cards. If the client ID is set but a
 * specific placement's slot ID isn't, that placement also falls back —
 * useful for staged rollouts (start with one slot, expand later).
 */

export type AdPlacement =
  | "connect-panel"
  | "plan-panel"
  | "earn-panel"
  | "family-panel"
  | "notifications-feed"
  | "post-call-interstitial"
  | "settings-page"
  | "phonebook-page";

export function getAdSenseClientId(): string | null {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || null;
}

export function getAdSenseSlotId(placement: AdPlacement): string | null {
  switch (placement) {
    case "connect-panel":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONNECT_PANEL || null;
    case "plan-panel":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLAN_PANEL || null;
    case "earn-panel":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_EARN_PANEL || null;
    case "family-panel":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_FAMILY_PANEL || null;
    case "notifications-feed":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_NOTIFICATIONS_FEED || null;
    case "post-call-interstitial":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_CALL || null;
    case "settings-page":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_SETTINGS || null;
    case "phonebook-page":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_PHONEBOOK || null;
    default:
      return null;
  }
}

/**
 * The AdSense script URL with the publisher ID baked in. Loaded once
 * in app/layout.tsx via next/script when a client ID is configured.
 */
export function getAdSenseScriptSrc(clientId: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}
