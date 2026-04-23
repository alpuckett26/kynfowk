import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { UpcomingCallCard } from "@/components/UpcomingCallCard";
import { useFamilyMetrics } from "@/lib/hooks/useFamilyMetrics";
import { DEMO_FAMILY_ID } from "@/lib/constants";

export default function HomeScreen() {
  const { metrics, loading, error } = useFamilyMetrics(DEMO_FAMILY_ID);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home (hook added)</Text>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Hook error (caught, did not crash)</Text>
          <Text style={styles.errorMsg}>{error.message}</Text>
        </View>
      ) : loading ? (
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
  loadingCard: { height: 200, borderRadius: 20, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f3f4f6" },
  errorCard: { padding: 16, borderRadius: 12, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  errorTitle: { fontSize: 13, fontWeight: "700", color: "#b91c1c", marginBottom: 6 },
  errorMsg: { fontSize: 12, color: "#991b1b" },
});
