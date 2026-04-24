import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useFamilyMetrics } from "@/lib/hooks/useFamilyMetrics";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { UpcomingCallCard } from "@/components/UpcomingCallCard";
import { DEMO_FAMILY_ID, DEMO_FAMILY_NAME } from "@/lib/constants";

export default function HomeScreen() {
  const { metrics, loading } = useFamilyMetrics(DEMO_FAMILY_ID);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.familyName}>{DEMO_FAMILY_NAME} Family</Text>
        </View>
        <Pressable style={styles.avatarBtn}>
          <Text style={styles.avatarEmoji}>💜</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#d946ef" />
        </View>
      ) : (
        <ConnectionsCounter metrics={metrics} />
      )}

      <Text style={styles.sectionTitle}>Upcoming calls</Text>
      <UpcomingCallCard
        title="Sunday catch-up"
        date="Sun, Mar 16"
        time="6:00 PM"
        participants="All 4 members"
        onJoin={() => router.push("/call/demo-call-id")}
      />
      <UpcomingCallCard
        title="Check-in with Gran"
        date="Wed, Mar 19"
        time="11:00 AM"
        participants="Margaret + David"
        onJoin={() => router.push("/call/demo-call-id")}
      />

      <Pressable style={styles.scheduleCta} onPress={() => router.push("/calls")}>
        <Text style={styles.scheduleCtaText}>+ Schedule a new call</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  greeting: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  familyName: { fontSize: 24, fontWeight: "700", color: "#111827", marginTop: 2 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fae8ff", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 22 },
  loadingCard: { height: 200, borderRadius: 20, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f3f4f6" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8 },
  scheduleCta: { borderRadius: 16, borderWidth: 2, borderColor: "#e9d5ff", borderStyle: "dashed", padding: 16, alignItems: "center", marginTop: 4 },
  scheduleCtaText: { fontSize: 14, fontWeight: "600", color: "#a855f7" },
});
