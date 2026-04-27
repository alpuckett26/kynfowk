import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { AdminCircleSummary } from "@/types/admin";

export default function AdminCirclesList() {
  const [circles, setCircles] = useState<AdminCircleSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    try {
      const data = await admin.listCircles();
      setCircles(data.circles);
    } catch (e) {
      console.warn("[admin circles] failed", e);
      setCircles([]);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.h1}>Every circle</Text>
      <Text style={styles.meta}>
        {circles?.length ?? 0} total. Tap a circle to inspect members,
        calls, and recent activity.
      </Text>
      {(circles ?? []).map((c) => (
        <Pressable
          key={c.id}
          onPress={() => router.push(`/admin/circles/${c.id}`)}
        >
          <Card>
            <Text style={styles.title}>{c.name}</Text>
            <Text style={styles.metaSm}>
              {c.memberCount} member{c.memberCount === 1 ? "" : "s"} ·{" "}
              {c.ownerEmail ?? c.ownerName ?? "no owner"}
            </Text>
            {c.lastActivityAt ? (
              <Text style={styles.metaSm}>
                Last active{" "}
                {new Date(c.lastActivityAt).toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.metaSm}>No activity yet</Text>
            )}
          </Card>
        </Pressable>
      ))}
      {circles && circles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.meta}>No circles to show.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  metaSm: { fontSize: fontSize.xs, color: colors.textSubtle },
  empty: { padding: spacing.xl, alignItems: "center" },
});
