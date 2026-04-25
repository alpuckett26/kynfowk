import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export function Toggle({
  label,
  subtitle,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  subtitle?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onToggle}
      disabled={disabled}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  text: { flex: 1, gap: 2 },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tick: {
    color: colors.primaryText,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
  },
});
