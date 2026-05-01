import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

/**
 * In-app transition splash. Mirrors components/splash-screen.tsx + the
 * page-transition.tsx tree mark on the web. Renders the tree using View
 * + borderRadius circles + a rect — no extra image asset, no
 * react-native-svg dep.
 *
 * Auto-hides after ~1.4s. Visible only on the first mount per app launch.
 */
export function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    const fadeAt = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 1400);
    return () => clearTimeout(fadeAt);
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.shell, { opacity }]} pointerEvents="none">
      <View style={styles.tree}>
        {/* Top crown */}
        <View
          style={[
            styles.crown,
            { width: 144, height: 144, borderRadius: 72, top: 0, left: 28 },
          ]}
        />
        {/* Left crown */}
        <View
          style={[
            styles.crown,
            { width: 108, height: 108, borderRadius: 54, top: 56, left: 0 },
          ]}
        />
        {/* Right crown */}
        <View
          style={[
            styles.crown,
            { width: 108, height: 108, borderRadius: 54, top: 56, left: 92 },
          ]}
        />
        {/* Trunk */}
        <View style={styles.trunk} />
      </View>
      <Text style={styles.brand}>Kynfowk</Text>
      <Text style={styles.tagline}>Make family time more rewarding</Text>
    </Animated.View>
  );
}

const TERRACOTTA = "#c7663f";

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf6ec",
    zIndex: 999,
  },
  tree: {
    width: 200,
    height: 240,
    position: "relative",
    marginBottom: spacing.lg,
  },
  crown: {
    position: "absolute",
    backgroundColor: TERRACOTTA,
    opacity: 0.85,
  },
  trunk: {
    position: "absolute",
    bottom: 24,
    left: 88,
    width: 24,
    height: 64,
    borderRadius: 6,
    backgroundColor: TERRACOTTA,
    opacity: 0.85,
  },
  brand: {
    fontSize: 36,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
