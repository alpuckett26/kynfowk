import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AdBanner } from "@/components/AdBanner";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  DAYS,
  TIME_BLOCKS,
  fetchAvailability,
  saveAvailability,
  slotKey,
} from "@/lib/availability";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { AvailabilitySummaryItem } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needs-onboarding" }
  | {
      kind: "ok";
      circleName: string;
      slots: Set<string>;
      summary: AvailabilitySummaryItem[];
      saved: Set<string>;
    };

export default function ScheduleTab() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchAvailability();
      if (res.needsOnboarding) {
        setState({ kind: "needs-onboarding" });
        return;
      }
      setState({
        kind: "ok",
        circleName: res.circle.name,
        slots: new Set(res.slots),
        summary: res.summary,
        saved: new Set(res.slots),
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't load availability";
      setState({ kind: "error", message });
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

  const dirty = useMemo(() => {
    if (state.kind !== "ok") return false;
    if (state.slots.size !== state.saved.size) return true;
    for (const s of state.slots) if (!state.saved.has(s)) return true;
    return false;
  }, [state]);

  const toggle = (key: string) => {
    setStatusMessage(null);
    setState((prev) => {
      if (prev.kind !== "ok") return prev;
      const next = new Set(prev.slots);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, slots: next };
    });
  };

  const onSave = async () => {
    if (state.kind !== "ok") return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveAvailability([...state.slots]);
      setState({
        kind: "ok",
        circleName: state.circleName,
        slots: new Set(res.slots),
        saved: new Set(res.slots),
        summary: res.summary,
      });
      setStatusMessage(
        res.slots.length
          ? "Availability saved."
          : "Availability cleared."
      );
    } catch (error) {
      const m = error instanceof Error ? error.message : "Couldn't save";
      setStatusMessage(m);
    } finally {
      setSaving(false);
    }
  };

  const onClear = () => {
    setStatusMessage(null);
    setState((prev) =>
      prev.kind === "ok" ? { ...prev, slots: new Set() } : prev
    );
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
          title="Couldn't load availability"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }
  if (state.kind === "needs-onboarding") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Schedule</Text>
          <Text style={styles.title}>Start your circle</Text>
          <Text style={styles.lede}>
            Once you're in a family circle you can mark your weekly windows
            here.
          </Text>
        </View>
        <Card>
          <Button label="Create circle" onPress={() => router.push("/onboarding")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Schedule</Text>
        <Text style={styles.title}>Your weekly rhythm</Text>
        <Text style={styles.lede}>
          Tap each window you can usually keep. Stronger overlap with the rest
          of {state.circleName} = better suggestions.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Weekly availability" />
        <View style={styles.gridHeader}>
          <Text style={[styles.gridHeaderCell, styles.dayCol]} />
          {TIME_BLOCKS.map((block) => (
            <View key={block.label} style={[styles.gridHeaderCell, styles.timeCol]}>
              <Text style={styles.timeLabel}>{block.label}</Text>
              <Text style={styles.timeSubtitle}>{block.subtitle}</Text>
            </View>
          ))}
        </View>
        {DAYS.map((day) => (
          <View key={day.value} style={styles.row}>
            <View style={[styles.cell, styles.dayCol]}>
              <Text style={styles.dayLabel}>{day.label}</Text>
            </View>
            {TIME_BLOCKS.map((block) => {
              const key = slotKey(day.value, block.startHour, block.endHour);
              const on = state.slots.has(key);
              return (
                <Pressable
                  key={`${day.value}-${block.label}`}
                  style={[
                    styles.cell,
                    styles.timeCol,
                    styles.slot,
                    on && styles.slotOn,
                  ]}
                  onPress={() => toggle(key)}
                >
                  {on ? <Text style={styles.slotTick}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      {state.summary.length ? (
        <Card>
          <SectionHeader title="Saved windows" />
          {state.summary.map((s) => (
            <Text key={s.weekday} style={styles.summaryLine}>
              {s.label}
            </Text>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={saving ? "Saving…" : dirty ? "Save changes" : "All saved"}
          onPress={onSave}
          loading={saving}
          disabled={!dirty}
        />
        {state.slots.size > 0 ? (
          <Button label="Clear all windows" variant="ghost" onPress={onClear} />
        ) : null}
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      </View>

      <Card>
        <SectionHeader title="Plan a call" />
        <Text style={styles.lede}>
          Pick a date, time, and who to invite. The call lands on everyone's
          dashboard immediately.
        </Text>
        <Button label="Schedule a call" onPress={() => router.push("/schedule/new")} />
        <Button
          label="Recurring calls"
          variant="secondary"
          onPress={() => router.push("/recurring")}
        />
      </Card>

      <AdBanner placement="schedule-tab" />
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
  gridHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: spacing.xs,
  },
  gridHeaderCell: {
    paddingHorizontal: 2,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  cell: {
    minHeight: 44,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCol: { flexBasis: 44, flexGrow: 0, flexShrink: 0 },
  timeCol: { flex: 1 },
  dayLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
  },
  timeSubtitle: {
    fontSize: 10,
    color: colors.textSubtle,
    textAlign: "center",
  },
  slot: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginHorizontal: 2,
  },
  slotOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotTick: {
    color: colors.primaryText,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
  },
  summaryLine: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  actions: { gap: spacing.sm },
  status: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
