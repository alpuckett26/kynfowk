import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { AdminOverview } from "@/types/admin";

export default function AdminHome() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await admin.overview();
      setOverview(data);
    } catch (e) {
      console.warn("[admin] overview failed", e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const wrap = async (kind: string, fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      const result = await fn();
      Alert.alert("Done", JSON.stringify(result, null, 2));
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Internal admin</Text>
        <Text style={styles.h1}>Testing toolkit</Text>
      </View>

      <View style={styles.statRow}>
        <StatTile label="Circles" value={overview?.circleCount ?? 0} />
        <StatTile label="Users" value={overview?.userCount ?? 0} />
        <StatTile
          label="Auto next 7d"
          value={overview?.autoScheduledNext7Days ?? 0}
        />
      </View>

      <Card>
        <Text style={styles.h2}>Inspect</Text>
        <Button
          label="Browse circles"
          onPress={() => router.push("/admin/circles")}
          variant="secondary"
        />
        <Button
          label="Search users"
          onPress={() => router.push("/admin/users")}
          variant="secondary"
        />
        <Button
          label="Audit log"
          onPress={() => router.push("/admin/audit")}
          variant="secondary"
        />
      </Card>

      <Card>
        <Text style={styles.h2}>Test fixtures</Text>
        <Text style={styles.meta}>
          Spawn a 6-person Test Family with relationships + availability,
          or wipe every circle named "Test Family*".
        </Text>
        <Button
          label="Spawn test family"
          onPress={() =>
            wrap("spawn", () => admin.spawnTestFamily())
          }
          loading={busy === "spawn"}
        />
        <Button
          label="Wipe test families"
          variant="danger"
          onPress={() =>
            Alert.alert(
              "Confirm wipe",
              "Delete every circle named 'Test Family*'?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Wipe",
                  style: "destructive",
                  onPress: () =>
                    wrap("wipe", () => admin.wipeTestFamilies()),
                },
              ]
            )
          }
          loading={busy === "wipe"}
        />
      </Card>

      <Card>
        <Text style={styles.h2}>Cron triggers</Text>
        <Button
          label="Run notification sweep"
          onPress={() => wrap("sweep", () => admin.cronSweep())}
          loading={busy === "sweep"}
        />
        <Button
          label="Run auto-schedule"
          onPress={() =>
            wrap("auto-schedule", () => admin.cronAutoSchedule())
          }
          loading={busy === "auto-schedule"}
        />
        <Button
          label="Materialize recurrences"
          onPress={() =>
            wrap("recurrence", () => admin.cronRecurrence())
          }
          loading={busy === "recurrence"}
        />
      </Card>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { gap: spacing.xs },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  h1: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text },
  h2: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  statRow: { flexDirection: "row", gap: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textSubtle, textTransform: "uppercase", letterSpacing: 0.5 },
});
