import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { EmptyState } from "@/components/EmptyState";
import { ApiError } from "@/lib/api";
import { fetchActivity } from "@/lib/activity";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import { relativeTime } from "@/lib/format";
import type { ActivityFeedItem } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; items: ActivityFeedItem[] };

export default function ActivityScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchActivity(100);
      setState({ kind: "ok", items: res.items });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load activity";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load activity"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Activity</Text>
        <Text style={styles.title}>Family timeline</Text>
        <Text style={styles.lede}>
          Every invite, scheduled call, recap, and update.
        </Text>
      </View>

      <Card>
        <SectionHeader title={`${state.items.length} entries`} />
        {state.items.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            description="Activity shows up here as your circle takes action."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {state.items.map((item) => (
              <ListItem
                key={item.id}
                title={item.summary}
                meta={relativeTime(item.createdAt)}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", marginBottom: spacing.xs },
  header: { gap: 4 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  lede: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
});
