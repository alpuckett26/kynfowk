import { Text, View, StyleSheet } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { colors, fontSize, fontWeight } from "@/lib/theme";

export default function InboxTab() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Inbox</Text>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <Card>
        <EmptyState
          title="Coming in M7"
          description="Reminders, recap nudges, and family activity, all in one place."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
});
