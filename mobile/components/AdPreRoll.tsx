/**
 * mobile/components/AdPreRoll.tsx
 *
 * Soft "Sorry fam, gotta pay bills 🤷🏾‍♂️" overlay shown briefly above
 * the first ad of each session. Same pattern as the web AdPreRoll
 * (M54). Once-per-session via AsyncStorage.
 *
 * Renders absolutely-positioned over its parent so the actual ad can
 * be loading behind it. Auto-dismisses after 1500 ms.
 */

import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors, fontSize, spacing } from "@/lib/theme";

const SESSION_KEY = "kynfowk_ad_intro_seen_v1";

// Module-level so multiple AdBanner instances mounting in the same
// session don't all fire the overlay; the first one wins.
let sessionIntroShown = false;

export function AdPreRoll() {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (sessionIntroShown) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SESSION_KEY);
        if (seen) return;
        if (cancelled) return;
        sessionIntroShown = true;
        await AsyncStorage.setItem(SESSION_KEY, "1");
        setVisible(true);
        // Fade out the last 300 ms.
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, 1200);
      } catch {
        /* sessionStorage unavailable on this device — skip silently */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Text style={styles.headline}>Sorry fam, gotta pay bills 🤷🏾‍♂️</Text>
      <Text style={styles.body}>This ad helps fund your circle&apos;s pool.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff7ef",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    zIndex: 2,
  },
  headline: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
