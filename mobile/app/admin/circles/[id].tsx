import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { AdminCircleDetail } from "@/types/admin";

export default function AdminCircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AdminCircleDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setData(await admin.getCircle(id));
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const reset = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const r = await admin.resetAutoSchedule({ circleId: id });
      Alert.alert("Reset", `${r.canceled} auto-scheduled call(s) canceled.`);
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Screen>
        <Text style={styles.meta}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.h1}>{data.circle.name}</Text>
      <Text style={styles.meta}>
        Created {new Date(data.circle.created_at).toLocaleDateString()}
      </Text>

      <Card>
        <Text style={styles.h2}>Members ({data.members.length})</Text>
        {data.members.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.rowTitle}>{m.display_name}</Text>
            <Text style={styles.rowMeta}>
              {m.role} · {m.status}
              {m.is_minor ? " · minor" : ""}
              {m.invite_email ? ` · ${m.invite_email}` : ""}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.h2}>Recent calls ({data.calls.length})</Text>
        {data.calls.slice(0, 15).map((c) => (
          <View key={c.id} style={styles.row}>
            <Text style={styles.rowTitle}>{c.title}</Text>
            <Text style={styles.rowMeta}>
              {new Date(c.scheduled_start).toLocaleString()} · {c.status}
              {c.auto_scheduled ? ` · auto (${c.auto_schedule_tier ?? "?"})` : ""}
            </Text>
          </View>
        ))}
        {data.calls.length === 0 ? (
          <Text style={styles.meta}>No calls yet.</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Activity ({data.activity.length})</Text>
        {data.activity.slice(0, 15).map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowTitle}>{a.activity_type}</Text>
            <Text style={styles.rowMeta}>{a.summary}</Text>
            <Text style={styles.rowMeta}>
              {new Date(a.created_at).toLocaleString()}
            </Text>
          </View>
        ))}
        {data.activity.length === 0 ? (
          <Text style={styles.meta}>No activity.</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Actions</Text>
        <Button
          label="Reset auto-schedule for this circle"
          variant="danger"
          onPress={reset}
          loading={busy}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  h2: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  row: { gap: 2, paddingVertical: spacing.xs },
  rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  rowMeta: { fontSize: fontSize.xs, color: colors.textSubtle },
});
