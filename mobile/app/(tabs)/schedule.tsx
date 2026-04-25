import { Text, View, StyleSheet } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { colors, fontSize, fontWeight } from "@/lib/theme";

export default function ScheduleTab() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Schedule</Text>
        <Text style={styles.title}>Plan a call</Text>
      </View>
      <Card>
        <EmptyState
          title="Coming in M5"
          description="Pick participants, find an overlap, and put a call on the calendar — straight from your phone."
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
