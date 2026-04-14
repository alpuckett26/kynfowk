import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getCallSummary } from "@kynfowk/connections";
import { supabase } from "@/lib/supabase";
import { formatMinutes } from "@kynfowk/utils";
import { COLORS } from "@/lib/constants";
import type { CallSummaryMetrics } from "@kynfowk/connections";

const DEMO_SUMMARY: CallSummaryMetrics = {
  durationMinutes: 45,
  participantCount: 4,
  scoreEarned: 5,
  events: [
    "Connection made",
    "Quality time (10+ min)",
    "Group connection (3+ members)",
    "Elder included",
  ],
};

const EVENT_ICONS: Record<string, string> = {
  "Connection made": "📞",
  "Quality time (10+ min)": "⏱️",
  "Group connection (3+ members)": "👥",
  "Reconnection after a long time": "🎉",
  "Elder included": "🌻",
};

export default function PostCallScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [metrics, setMetrics] = useState<CallSummaryMetrics | null>(null);

  useEffect(() => {
    const isDemo =
      !process.env.EXPO_PUBLIC_SUPABASE_URL || callId === "demo-call-id";

    if (isDemo) {
      setMetrics(DEMO_SUMMARY);
      return;
    }

    getCallSummary(supabase, callId).then(setMetrics);
  }, [callId]);

  if (!metrics) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.brand} size="large" />
        <Text style={styles.loadingText}>Loading your summary…</Text>
      </View>
    );
  }

  const { durationMinutes, participantCount, scoreEarned, events } = metrics;

  const warmMessage =
    scoreEarned >= 5
      ? "What a call! Your family connection score just jumped."
      : scoreEarned >= 3
      ? "Every moment counts. Your streak is holding strong."
      : "Great to see your family together. Keep it up!";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>💜</Text>
        </View>
        <Text style={styles.heroTitle}>Moment Shared!</Text>
        <Text style={styles.heroSubtitle}>
          That call just added to your family story.
        </Text>
      </View>

      {/* Stats strip */}
      <View style={styles.statsRow}>
        {[
          { label: "Duration", value: formatMinutes(durationMinutes), icon: "⏱️" },
          { label: "People", value: `${participantCount}`, icon: "👥" },
          { label: "Score earned", value: `+${scoreEarned}`, icon: "⭐" },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Unlocked events */}
      {events.length > 0 && (
        <View style={styles.eventsCard}>
          <Text style={styles.eventsTitle}>What you unlocked</Text>
          {events.map((evt) => (
            <View key={evt} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{EVENT_ICONS[evt] ?? "✅"}</Text>
              <Text style={styles.eventLabel}>{evt}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Warm message */}
      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{warmMessage}</Text>
        {scoreEarned > 0 && (
          <Text style={styles.messageSub}>
            +{scoreEarned} added to your Connection Score
          </Text>
        )}
      </View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.doneBtnText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.gray50,
  },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
    alignItems: "stretch",
  },
  hero: { alignItems: "center", gap: 10, paddingVertical: 8 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: COLORS.gray900 },
  heroSubtitle: { fontSize: 15, color: COLORS.gray500, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 20, fontWeight: "700", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray500, textAlign: "center" },
  eventsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 18,
    gap: 12,
  },
  eventsTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray700 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  eventIcon: { fontSize: 20, width: 28, textAlign: "center" },
  eventLabel: { fontSize: 14, color: COLORS.gray700, flex: 1 },
  messageCard: {
    backgroundColor: COLORS.brand,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  messageText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    lineHeight: 24,
  },
  messageSub: { fontSize: 13, color: COLORS.brandLight },
  doneBtn: {
    backgroundColor: COLORS.gray900,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  doneBtnPressed: { backgroundColor: COLORS.gray700 },
  doneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
