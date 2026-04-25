import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function StatGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  label: {
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
    fontWeight: fontWeight.bold,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  hint: { fontSize: fontSize.xs, color: colors.textMuted },
});
