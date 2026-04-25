import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export function ListItem({
  title,
  subtitle,
  meta,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Wrap>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  trailing: { gap: spacing.xs, alignItems: "flex-end" },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  meta: { fontSize: fontSize.xs, color: colors.textSubtle },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
