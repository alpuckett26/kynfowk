import { View, Text, StyleSheet } from "react-native";
import { StatTile } from "@/components/StatTile";
import { formatMinutes, formatNumber, pluralize } from "@kynfowk/utils";
import { COLORS } from "@/lib/constants";
import type { ConnectionMetrics } from "@kynfowk/types";

interface ConnectionsCounterProps {
  metrics: ConnectionMetrics;
}

function ScoreMeter({ score }: { score: number }) {
  const pct = Math.min((score / 60) * 100, 100);
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.scoreLabel}>Family Connection Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <Text style={styles.scoreEmoji}>💜</Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.scoreHint}>
        {score < 10
          ? "Your family journey starts here"
          : score < 25
          ? "Building meaningful connections"
          : "Beautifully connected family"}
      </Text>
    </View>
  );
}

export function ConnectionsCounter({ metrics }: ConnectionsCounterProps) {
  const {
    completedCalls,
    totalMinutes,
    uniqueMembersThisWeek,
    streakWeeks,
    connectionScore,
    firstReconnections,
    elderCalls,
  } = metrics;

  return (
    <View style={styles.container}>
      <ScoreMeter score={connectionScore} />

      <View style={styles.grid}>
        <StatTile label="Moments Shared" value={formatNumber(completedCalls)} icon="📞" />
        <StatTile label="Time Together" value={formatMinutes(totalMinutes)} icon="⏱️" />
        <StatTile label="Connected" value={`${uniqueMembersThisWeek}`} icon="👥" />
        <StatTile
          label="Streak"
          value={streakWeeks > 0 ? `${streakWeeks}w` : "—"}
          icon="🔥"
        />
      </View>

      {/* Bonus chips */}
      {(firstReconnections > 0 || elderCalls > 0) && (
        <View style={styles.chips}>
          {firstReconnections > 0 && (
            <View style={[styles.chip, styles.chipPurple]}>
              <Text style={styles.chipEmoji}>🎉</Text>
              <View>
                <Text style={styles.chipTitle}>
                  {firstReconnections} reconnection{firstReconnections > 1 ? "s" : ""}
                </Text>
                <Text style={styles.chipSub}>first call in 30+ days</Text>
              </View>
            </View>
          )}
          {elderCalls > 0 && (
            <View style={[styles.chip, styles.chipAmber]}>
              <Text style={styles.chipEmoji}>🌻</Text>
              <View>
                <Text style={[styles.chipTitle, styles.chipTitleAmber]}>
                  Elder included
                </Text>
                <Text style={[styles.chipSub, styles.chipSubAmber]}>
                  {elderCalls} {pluralize(elderCalls, "time")}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Empty state */}
      {completedCalls === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyTitle}>Your first call is waiting</Text>
          <Text style={styles.emptyBody}>
            Schedule a call and your family connection journey begins here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  scoreCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 18,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  scoreLabel: { fontSize: 13, color: COLORS.gray500, fontWeight: "500" },
  scoreValue: { fontSize: 40, fontWeight: "700", color: COLORS.gray900, marginTop: 2 },
  scoreEmoji: { fontSize: 28 },
  scoreBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray100,
    overflow: "hidden",
    marginBottom: 8,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  scoreHint: { fontSize: 12, color: COLORS.gray400 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chips: { gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  chipPurple: { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
  chipAmber: { backgroundColor: COLORS.warmLight, borderColor: "#fde68a" },
  chipEmoji: { fontSize: 22 },
  chipTitle: { fontSize: 13, fontWeight: "600", color: "#6b21a8" },
  chipTitleAmber: { color: "#92400e" },
  chipSub: { fontSize: 11, color: "#9333ea", marginTop: 1 },
  chipSubAmber: { color: "#b45309" },
  emptyState: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray700 },
  emptyBody: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
