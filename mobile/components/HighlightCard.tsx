import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { DashboardHighlight } from "@/types/api";

const toneColors = {
  warm: { bg: "#f3e7c5", border: "#e3cfa0", accent: "#8a6a1f" },
  success: { bg: colors.successBg, border: "#bcd6ad", accent: colors.success },
  neutral: { bg: colors.surfaceMuted, border: colors.border, accent: colors.textMuted },
};

export function HighlightCard({ highlight }: { highlight: DashboardHighlight }) {
  const tone = toneColors[highlight.tone] ?? toneColors.neutral;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      <Text style={[styles.title, { color: tone.accent }]}>{highlight.title}</Text>
      <Text style={styles.value}>{highlight.value}</Text>
      <Text style={styles.detail}>{highlight.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
