import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

type Tone = "neutral" | "live" | "success" | "warning" | "danger";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.base, toneStyles[tone].container]}>
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

const toneStyles = {
  neutral: StyleSheet.create({
    container: { backgroundColor: colors.surfaceMuted },
    label: { color: colors.text },
  }),
  live: StyleSheet.create({
    container: { backgroundColor: colors.primary },
    label: { color: colors.primaryText },
  }),
  success: StyleSheet.create({
    container: { backgroundColor: colors.successBg },
    label: { color: colors.success },
  }),
  warning: StyleSheet.create({
    container: { backgroundColor: colors.warningBg },
    label: { color: colors.warning },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: colors.dangerBg },
    label: { color: colors.danger },
  }),
};
