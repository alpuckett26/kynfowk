import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { AdminUserSummary } from "@/types/admin";

export default function AdminUsersSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminUserSummary[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const data = await admin.searchUsers(q.trim());
      setResults(data.users);
    } catch (e) {
      console.warn("[admin users] search failed", e);
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.h1}>Find a user</Text>
      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Email or name (min 2 chars)"
        autoCapitalize="none"
      />
      <Button label="Search" onPress={run} loading={busy} />

      {(results ?? []).map((u) => (
        <Pressable
          key={u.id}
          onPress={() => router.push(`/admin/users/${u.id}`)}
        >
          <Card>
            <Text style={styles.title}>{u.full_name ?? "(no name)"}</Text>
            <Text style={styles.metaSm}>{u.email ?? "(no email)"}</Text>
            <Text style={styles.metaSm}>
              {u.is_super_admin ? "super admin · " : ""}
              joined {new Date(u.created_at).toLocaleDateString()}
            </Text>
          </Card>
        </Pressable>
      ))}
      {results && results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.meta}>No matches.</Text>
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
