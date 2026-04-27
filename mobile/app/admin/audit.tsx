import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { AuditEntry } from "@/types/admin";

export default function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await admin.audit();
      setEntries(r.entries);
    } catch (e) {
      console.warn("[admin audit] failed", e);
      setEntries([]);
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
      <Text style={styles.h1}>Audit log</Text>
      <Text style={styles.meta}>
        Most recent {entries?.length ?? 0} super-admin actions.
      </Text>
      {(entries ?? []).map((e) => (
        <Card key={e.id}>
          <View style={styles.rowHead}>
            <Text style={styles.title}>{e.action_kind}</Text>
            <Text style={styles.metaSm}>
              {new Date(e.created_at).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.metaSm}>
            actor: {e.actor_email ?? e.actor_user_id}
          </Text>
          {e.target_user_id ? (
            <Text style={styles.metaSm}>
              target user: {e.target_user_id}
            </Text>
          ) : null}
          {e.target_circle_id ? (
            <Text style={styles.metaSm}>
              target circle: {e.target_circle_id}
            </Text>
          ) : null}
          {e.payload ? (
            <Text style={styles.payload}>
              {JSON.stringify(e.payload, null, 2)}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  metaSm: { fontSize: fontSize.xs, color: colors.textSubtle },
  rowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  payload: {
    fontFamily: "Courier",
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: 6,
  },
});
