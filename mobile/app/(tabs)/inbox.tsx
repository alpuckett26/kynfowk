import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
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
  NotificationType,
} from "@/types/api";

const TYPE_GLYPHS: Record<NotificationType, string> = {
  call_scheduled: "📅",
  reminder_24h_before: "🔔",
  reminder_15m_before: "⏰",
  starting_now: "🔴",
  missing_join_link_warning: "⚠️",
  call_passed_without_completion: "↻",
  invite_claimed: "👋",
  recap_posted: "📝",
  weekly_connection_digest: "📊",
};

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
    // Optimistically mark read in local state for instant feedback.
    if (!item.readAt) {
      setState((prev) => {
        if (prev.kind !== "ok") return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === item.id ? { ...n, readAt: now } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        };
      });
      try {
        await markNotificationRead(item.id);
      } catch {
        // non-fatal; server will reconcile on next load
      }
    }
    if (item.ctaHref) {
      const callMatch = item.ctaHref.match(/\/calls\/([^/?#]+)/);
      if (callMatch) {
        router.push(`/calls/${callMatch[1]}`);
        return;
      }
    }
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
    <Screen onRefresh={onRefresh} refreshing={refreshing} contentStyle={styles.tightContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {state.unreadCount ? `${state.unreadCount} unread · ` : "All caught up · "}
            {state.totalCount} total
          </Text>
        </View>
        {state.unreadCount > 0 ? (
          <Pressable onPress={onMarkAll} disabled={busy}>
            <Text style={styles.markAll}>{busy ? "…" : "Mark all read"}</Text>
          </Pressable>
        ) : null}
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
        <View style={styles.list}>
          {state.notifications.map((n, idx) => {
            const unread = !n.readAt;
            const isLast = idx === state.notifications.length - 1;
            return (
              <Pressable
                key={n.id}
                style={({ pressed }) => [
                  styles.row,
                  unread ? styles.rowUnread : styles.rowRead,
                  !isLast && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => void onTapItem(n)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarGlyph}>
                    {TYPE_GLYPHS[n.type] ?? "✉️"}
                  </Text>
                </View>
                <View style={styles.body}>
                  <View style={styles.topLine}>
                    <Text style={styles.sender} numberOfLines={1}>
                      {NOTIFICATION_TYPE_LABELS[n.type] ?? "Family update"}
                    </Text>
                    <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
                  </View>
                  <Text
                    style={[styles.subject, unread ? styles.subjectUnread : styles.subjectRead]}
                    numberOfLines={2}
                  >
                    {unread ? <Text style={styles.unreadDot}>●  </Text> : null}
                    <Text style={unread ? styles.titleUnread : styles.titleRead}>
                      {n.title}
                    </Text>
                    <Text style={styles.snippet}> — {n.body}</Text>
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: spacing.md }} />
      <Button
        label="Notification preferences"
        variant="ghost"
        onPress={() => router.push("/settings/notifications")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tightContent: { paddingHorizontal: spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  markAll: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.successBg, borderColor: colors.success },
  chipText: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium },
  chipTextOn: { color: colors.success, fontWeight: fontWeight.bold },

  list: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md - 2,
  },
  rowUnread: { backgroundColor: colors.surface },
  rowRead: { backgroundColor: colors.bg },
  rowPressed: { opacity: 0.7 },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlyph: { fontSize: 16 },
  body: { flex: 1, gap: 2 },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  sender: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  subject: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  subjectUnread: { color: colors.text },
  subjectRead: { color: colors.textMuted },
  titleUnread: { fontWeight: fontWeight.bold, color: colors.text },
  titleRead: { fontWeight: fontWeight.medium, color: colors.textMuted },
  snippet: { color: colors.textMuted, fontWeight: fontWeight.regular },
  unreadDot: { color: colors.success, fontSize: 8 },
});
