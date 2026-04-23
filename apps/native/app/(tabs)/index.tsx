import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { UpcomingCallCard } from "@/components/UpcomingCallCard";
import { getFamilyMetrics } from "@kynfowk/connections";
import type { ConnectionMetrics } from "@kynfowk/types";

const DEMO_METRICS: ConnectionMetrics = {
  completedCalls: 3,
  totalMinutes: 122,
  uniqueMembersThisWeek: 4,
  streakWeeks: 4,
  connectionScore: 28,
  firstReconnections: 1,
  elderCalls: 2,
};

const fnCheck = typeof getFamilyMetrics;

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home (@kynfowk/connections imported, not called)</Text>
      <Text style={styles.marker}>getFamilyMetrics typeof: {fnCheck}</Text>
      <ConnectionsCounter metrics={DEMO_METRICS} />
      <UpcomingCallCard
        title="Sunday catch-up"
        date="Sun, Mar 16"
        time="6:00 PM"
        participants="All 4 members"
        onJoin={() => {}}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  marker: { fontSize: 12, color: "#059669", fontFamily: "monospace" },
});
