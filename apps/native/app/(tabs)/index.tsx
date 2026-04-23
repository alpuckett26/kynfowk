import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { UpcomingCallCard } from "@/components/UpcomingCallCard";
import { useFamilyMetrics } from "@/lib/hooks/useFamilyMetrics";
import { DEMO_FAMILY_ID } from "@/lib/constants";

export default function HomeScreen() {
  const { metrics, loading, error } = useFamilyMetrics(DEMO_FAMILY_ID);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home (hook w/ supabase call DISABLED)</Text>
      <Text style={styles.marker}>loading: {String(loading)} · error: {error ? error.message : "null"}</Text>
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#d946ef" />
        </View>
      ) : (
        <ConnectionsCounter metrics={metrics} />
      )}
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
  loadingCard: { height: 200, borderRadius: 20, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f3f4f6" },
});
