import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFamilyMetrics } from "@/lib/hooks/useFamilyMetrics";
import { useAllTimeStats } from "@/lib/hooks/useAllTimeStats";
import { StatTile } from "@/components/StatTile";
import { formatMinutes, formatNumber, pluralize } from "@kynfowk/utils";
import { DEMO_FAMILY_ID, DEMO_FAMILY_NAME } from "@/lib/constants";

const MILESTONES = [
  { label: "10 calls completed", threshold: 10, type: "calls", icon: "📞" },
  { label: "100 minutes together", threshold: 100, type: "minutes", icon: "⏱️" },
  { label: "Connection score 50+", threshold: 50, type: "score", icon: "⭐" },
  { label: "4-week streak", threshold: 4, type: "streak", icon: "🔥" },
  { label: "25 calls completed", threshold: 25, type: "calls", icon: "🎯" },
];

export default function ConnectionsScreen() {
  const { metrics } = useFamilyMetrics(DEMO_FAMILY_ID);
  const { stats } = useAllTimeStats(DEMO_FAMILY_ID);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Family Insights</Text>
      <Text style={styles.pageSubtitle}>{DEMO_FAMILY_NAME} Family · All time</Text>

      {/* Score card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Family Connection Score</Text>
        <Text style={styles.scoreValue}>{metrics.connectionScore}</Text>
        <View style={styles.scoreBar}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${Math.min((metrics.connectionScore / 60) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.scoreHint}>
          {metrics.connectionScore < 25
            ? "Building meaningful connections"
            : "Beautifully connected family"}
        </Text>
      </View>

      {/* This week */}
      <Text style={styles.sectionTitle}>This week</Text>
      <View style={styles.grid}>
        <StatTile
          label="Moments Shared"
          value={formatNumber(metrics.completedCalls)}
          icon="📞"
        />
        <StatTile
          label="Time Together"
          value={formatMinutes(metrics.totalMinutes)}
          icon="⏱️"
        />
        <StatTile
          label="Connected"
          value={`${metrics.uniqueMembersThisWeek} people`}
          icon="👥"
        />
        <StatTile
          label="Streak"
          value={metrics.streakWeeks > 0 ? `${metrics.streakWeeks}w` : "—"}
          icon="🔥"
        />
      </View>

      {/* Streak badge */}
      {metrics.streakWeeks > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>
            {metrics.streakWeeks >= 8 ? "🔥" : "✨"}
          </Text>
          <Text style={styles.streakText}>
            {metrics.streakWeeks}-{pluralize(metrics.streakWeeks, "week")} Reconnection Streak
          </Text>
        </View>
      )}

      {/* All time */}
      <Text style={styles.sectionTitle}>All time</Text>
      <View style={styles.card}>
        {[
          { icon: "📞", label: "Total calls", value: formatNumber(stats.totalCalls) },
          { icon: "⏱️", label: "Time together", value: formatMinutes(stats.totalMinutes) },
          { icon: "⭐", label: "Lifetime score", value: stats.totalScore.toString() },
          { icon: "🏆", label: "Best week", value: stats.bestWeekScore.toString() },
          { icon: "🔥", label: "Longest streak", value: `${stats.longestStreak} weeks` },
        ].map((row, i, arr) => (
          <View
            key={row.label}
            style={[styles.statRow, i < arr.length - 1 && styles.statRowBorder]}
          >
            <View style={styles.statRowLeft}>
              <Text style={styles.statRowIcon}>{row.icon}</Text>
              <Text style={styles.statRowLabel}>{row.label}</Text>
            </View>
            <Text style={styles.statRowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Milestones */}
      <Text style={styles.sectionTitle}>Milestones</Text>
      <View style={styles.card}>
        {MILESTONES.map((m, i, arr) => {
          const current =
            m.type === "minutes"
              ? stats.totalMinutes
              : m.type === "score"
              ? stats.totalScore
              : m.type === "streak"
              ? stats.longestStreak
              : stats.totalCalls;
          const achieved = current >= m.threshold;
          return (
            <View
              key={m.label}
              style={[styles.statRow, i < arr.length - 1 && styles.statRowBorder]}
            >
              <View style={styles.statRowLeft}>
                <Text style={styles.statRowIcon}>{m.icon}</Text>
                <Text style={[styles.statRowLabel, !achieved && styles.muted]}>
                  {m.label}
                </Text>
              </View>
              {achieved ? (
                <Text style={styles.achieved}>Achieved ✓</Text>
              ) : (
                <Text style={styles.muted}>{current}/{m.threshold}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom encouragement */}
      <View style={styles.encouragement}>
        <Text style={styles.encouragementTitle}>
          Your family made {stats.totalCalls} connections
        </Text>
        <Text style={styles.encouragementBody}>
          That&apos;s {stats.totalCalls} times you showed up for each other.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  pageSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2, marginBottom: 4 },
  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 20,
  },
  scoreLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500", marginBottom: 4 },
  scoreValue: { fontSize: 48, fontWeight: "700", color: "#111827" },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 8,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#d946ef",
  },
  scoreHint: { fontSize: 12, color: "#9ca3af" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 13, fontWeight: "600", color: "#92400e" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  statRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statRowIcon: { fontSize: 18 },
  statRowLabel: { fontSize: 14, color: "#374151" },
  statRowValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  achieved: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  muted: { color: "#9ca3af" },
  encouragement: {
    backgroundColor: "#d946ef",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  encouragementBody: { fontSize: 14, color: "#fae8ff" },
});
