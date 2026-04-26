import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Toggle } from "@/components/Toggle";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  fetchAutoScheduleSettings,
  saveAutoScheduleSettings,
} from "@/lib/auto-schedule";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { AutoScheduleSettings } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; settings: AutoScheduleSettings };

export default function AutoScheduleSettingsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchAutoScheduleSettings();
      setState({ kind: "ok", settings: res });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load settings";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (
    body: Parameters<typeof saveAutoScheduleSettings>[0],
    label: string
  ) => {
    setBusy(label);
    try {
      await saveAutoScheduleSettings(body);
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };

  const onToggleEnabled = (next: boolean) =>
    update({ enabled: next }, "enabled");

  const onPause = async (days: number | null) => {
    const pausedUntil =
      days === null
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await update({ pausedUntil }, days === null ? "resume" : `pause-${days}`);
  };

  const onSetMax = async (n: number) =>
    update({ maxPerWeek: n }, `max-${n}`);

  const pausedActive = useMemo(() => {
    if (state.kind !== "ok") return false;
    const until = state.settings.pausedUntil;
    return until ? new Date(until).getTime() > Date.now() : false;
  }, [state]);

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
          title="Couldn't load settings"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const { settings } = state;
  const maxOptions = [3, 5, 7, 10, 14];

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Auto-scheduling</Text>
        <Text style={styles.lede}>
          Kynfowk creates calls automatically based on your family
          relationships.
        </Text>
      </View>

      <Card>
        <Toggle
          label="Auto-schedule my family calls"
          subtitle={
            settings.enabled
              ? "On — Kynfowk will keep your family on the calendar."
              : "Off — you'll schedule manually."
          }
          checked={settings.enabled}
          onToggle={() => onToggleEnabled(!settings.enabled)}
        />
      </Card>

      {settings.enabled ? (
        <>
          <Card>
            <SectionHeader title="Pause" />
            {pausedActive ? (
              <>
                <Text style={styles.subtle}>
                  Paused until{" "}
                  {settings.pausedUntil
                    ? new Date(settings.pausedUntil).toLocaleDateString()
                    : "—"}
                  .
                </Text>
                <Button
                  label={busy === "resume" ? "Resuming…" : "Resume now"}
                  variant="secondary"
                  onPress={() => void onPause(null)}
                  loading={busy === "resume"}
                />
              </>
            ) : (
              <>
                <Text style={styles.subtle}>
                  Take a break without turning the engine off.
                </Text>
                <View style={styles.buttonRow}>
                  <Button
                    label={busy === "pause-7" ? "…" : "Pause 7 days"}
                    variant="ghost"
                    onPress={() => void onPause(7)}
                    loading={busy === "pause-7"}
                  />
                  <Button
                    label={busy === "pause-30" ? "…" : "Pause 30 days"}
                    variant="ghost"
                    onPress={() => void onPause(30)}
                    loading={busy === "pause-30"}
                  />
                </View>
              </>
            )}
          </Card>

          <Card>
            <SectionHeader title="Max calls per week" />
            <Text style={styles.subtle}>
              Kynfowk won't schedule more than this many auto-calls for you in
              any 7-day window.
            </Text>
            <View style={styles.chipRow}>
              {maxOptions.map((n) => {
                const on = settings.maxPerWeek === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => void onSetMax(n)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card>
            <SectionHeader title="Cadence by tier" />
            <View style={styles.tierTable}>
              {settings.tiers.map((t) => (
                <View key={t.id} style={styles.tierRow}>
                  <Text style={styles.tierName}>{t.name}</Text>
                  <Text style={styles.tierMeta}>
                    Every {t.min_days_between} days
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}
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
  subtle: { fontSize: fontSize.sm, color: colors.textMuted },
  buttonRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chipRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
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
  tierTable: { gap: spacing.sm },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tierMeta: { fontSize: fontSize.sm, color: colors.textMuted },
});
