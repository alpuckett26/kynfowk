import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { colors, fontSize, spacing } from "@/lib/theme";
import {
  ensureIapConnection,
  fetchPlusProducts,
  PLUS_MONTHLY_ID,
  purchasePlus,
  restorePurchases,
} from "@/lib/iap";

/**
 * Settings entry that fetches the Apple Plus subscription product,
 * shows its localized price, and runs the purchase flow on tap.
 *
 * Renders a no-op placeholder on Android until the Google Play
 * Billing path lands. The web Plus flow (Square checkout) is also
 * separate.
 */
export function UpgradeToPlusButton({ onPurchased }: { onPurchased?: () => void }) {
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await ensureIapConnection();
        const products = await fetchPlusProducts();
        if (cancelled) return;
        const monthly = products.find((p) => p.productId === PLUS_MONTHLY_ID);
        // localizedPrice is the App Store-formatted string ("$9.99").
        // Fall back to the raw price + currency if missing.
        if (monthly) {
          setPriceLabel(
            (monthly as { localizedPrice?: string }).localizedPrice
              ?? `${(monthly as { currency?: string }).currency ?? "USD"} ${(monthly as { price?: string }).price ?? ""}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.container}>
        <Text style={styles.headline}>Kynfowk Plus</Text>
        <Text style={styles.body}>
          Upgrade in the iPhone app or on kynfowk.com to remove ads and unlock rewarded earnings.
        </Text>
      </View>
    );
  }

  async function handleUpgrade() {
    if (purchasing) return;
    setPurchasing(true);
    const result = await purchasePlus(PLUS_MONTHLY_ID);
    setPurchasing(false);
    if (result.ok) {
      Alert.alert("Welcome to Kynfowk Plus", "Ads are off and rewards earnings are on.");
      onPurchased?.();
      return;
    }
    if (result.reason === "cancelled") return; // silent — user closed the sheet
    Alert.alert(
      "Couldn't complete the purchase",
      result.message ?? "Try again in a moment, or contact support if it keeps failing."
    );
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      Alert.alert("Restore complete", "If you have an active Plus subscription, your account is updated.");
    } catch (err) {
      Alert.alert(
        "Couldn't restore purchases",
        err instanceof Error ? err.message : "Please try again."
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Kynfowk Plus</Text>
      <Text style={styles.body}>
        Remove ads and unlock rewarded earnings. Cancel anytime in your iPhone Settings.
      </Text>

      <Button
        label={
          loading
            ? "Loading…"
            : priceLabel
              ? `Upgrade — ${priceLabel} / month`
              : "Upgrade to Plus"
        }
        loading={purchasing}
        onPress={handleUpgrade}
        disabled={loading}
      />

      <Button label="Restore purchases" onPress={handleRestore} variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  headline: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
