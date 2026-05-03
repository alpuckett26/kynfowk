/**
 * mobile/components/AdBanner.tsx
 *
 * Paid-tier-gated AdMob banner. Mirrors the web's <AdSlot> behavior:
 *   - paid tier → renders null (no slot)
 *   - free tier + ad unit ID configured → renders BannerAd + caption
 *   - free tier + ad unit ID unset (pre-AdMob-approval) → renders null
 *
 * The pre-roll overlay (AdPreRoll) renders above the BannerAd on the
 * first ad of the session.
 *
 * Lazy-imports react-native-google-mobile-ads so the bundle cost is
 * only paid when an ad is about to render.
 */

import { useEffect, useState, type ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdPreRoll } from "@/components/AdPreRoll";
import { type AdPlacement, getBannerUnitId } from "@/lib/admob";
import { useViewerBilling } from "@/lib/billing";
import { colors, fontSize, spacing } from "@/lib/theme";

interface BannerProps {
  unitId: string;
  size: string;
  requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (err: unknown) => void;
}

type AdMobModule = {
  BannerAd: ComponentType<BannerProps>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
};

let cachedModule: AdMobModule | null | "missing" = null;

async function loadAdMobModule(): Promise<AdMobModule | null> {
  if (cachedModule === "missing") return null;
  if (cachedModule) return cachedModule;
  try {
    const mod = await import("react-native-google-mobile-ads");
    cachedModule = {
      BannerAd: mod.BannerAd as ComponentType<BannerProps>,
      BannerAdSize: mod.BannerAdSize,
    };
    return cachedModule;
  } catch (err) {
    console.warn("[AdBanner] AdMob module unavailable", err);
    cachedModule = "missing";
    return null;
  }
}

export function AdBanner({ placement }: { placement: AdPlacement }) {
  const billing = useViewerBilling();
  const unitId = getBannerUnitId(placement);
  const [adMob, setAdMob] = useState<AdMobModule | null>(null);

  useEffect(() => {
    if (billing.isPaidTier || !unitId) return;
    void loadAdMobModule().then(setAdMob);
  }, [billing.isPaidTier, unitId]);

  if (billing.isPaidTier || !unitId || !adMob) return null;

  const { BannerAd, BannerAdSize } = adMob;

  return (
    <View style={styles.container}>
      <AdPreRoll />
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
      <Text style={styles.caption}>This ad helps fund your circle&apos;s pool.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.md,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  caption: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});
