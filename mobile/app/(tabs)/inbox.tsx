import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { EmptyState } from "@/components/EmptyState";
import { ApiError } from "@/lib/api";
import {
  NOTIFICATION_TYPE_LABELS,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { relativeTime } from "@/lib/format";
import type {
  NotificationItem,
  NotificationReadFilter,
} from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      notifications: NotificationItem[];
      unreadCount: number;
      totalCount: number;
    };

const FILTERS: { value: NotificationReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export default function InboxTab() {
  const [filter, setFilter] = useState<NotificationReadFilter>("all");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchNotifications({ read: filter });
      setState({
        kind: "ok",
        notifications: res.notifications,
        unreadCount: res.unreadCount,
        totalCount: res.totalCount,
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load inbox";
      setState({ kind: "error", message: m });
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onTapItem = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
      } catch {
        // non-fatal
      }
    }
    if (item.ctaHref) {
      const callMatch = item.ctaHref.match(/\/calls\/([^/?#]+)/);
      if (callMatch) {
        router.push(`/calls/${callMatch[1]}`);
        return;
      }
    }
    void load();
  };

  const onMarkAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <EmptyState
          title="Couldn't load inbox"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Inbox</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.lede}>
          {state.unreadCount} unread · {state.totalCount} total
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const on = filter === f.value;
          return (
            <Pressable
              key={f.value}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <SectionHeader
          title="Messages"
          action={
            state.unreadCount > 0 ? (
              <Button
                label={busy ? "Marking…" : "Mark all read"}
                variant="ghost"
                onPress={onMarkAll}
                loading={busy}
              />
            ) : null
          }
        />
        {state.notifications.length === 0 ? (
          <EmptyState
            title={
              filter === "unread"
                ? "All caught up"
                : filter === "read"
                  ? "No read notifications"
                  : "Nothing yet"
            }
            description="Reminders, recap nudges, and family activity will land here."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {state.notifications.map((n) => (
              <ListItem
                key={n.id}
                title={n.title}
                subtitle={n.body}
                meta={`${NOTIFICATION_TYPE_LABELS[n.type] ?? n.type} · ${relativeTime(n.createdAt)}`}
                trailing={n.readAt ? null : <Badge tone="warning" label="New" />}
                onPress={() => void onTapItem(n)}
              />
            ))}
          </View>
        )}
      </Card>

      <Button
        label="Notification preferences"
        variant="secondary"
        onPress={() => router.push("/settings/notifications")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  chipTextOn: { color: colors.primaryText },
});
