import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  cancelRecurrenceRule,
  createRecurrenceRule,
  fetchRecurrenceRules,
} from "@/lib/recurrence";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type {
  RecurrenceFrequency,
  RecurrenceRule,
} from "@/types/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      rules: RecurrenceRule[];
      isOwner: boolean;
    };

export default function RecurringScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetchRecurrenceRules();
      if (res.needsOnboarding) {
        setState({ kind: "error", message: "No circle yet." });
        return;
      }
      setState({
        kind: "ok",
        rules: res.rules ?? [],
        isOwner: res.viewerRole === "owner",
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
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
          title="Couldn't load"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Schedule</Text>
        <Text style={styles.title}>Recurring calls</Text>
        <Text style={styles.lede}>
          Set a weekly, biweekly, or monthly rhythm. Kynfowk creates the next
          four weeks of calls automatically.
        </Text>
      </View>

      {state.isOwner ? <CreateForm onCreated={() => void load()} /> : null}

      <Card>
        <SectionHeader title={`Active rules · ${state.rules.length}`} />
        {state.rules.length === 0 ? (
          <EmptyState
            title="No rules yet"
            description={
              state.isOwner
                ? "Add one above to start a recurring family call."
                : "The owner hasn't set up any recurring calls."
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {state.rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                canCancel={state.isOwner}
                onCanceled={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(new Date().getDay());
  const [dayOfMonth, setDayOfMonth] = useState<string>(
    String(new Date().getDate())
  );
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("30");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setMessage(null);
    if (!title.trim()) {
      setMessage("Title required.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setMessage("Time must be HH:MM (24-hour).");
      return;
    }
    setSaving(true);
    try {
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Chicago";
      const res = await createRecurrenceRule({
        title: title.trim(),
        frequency,
        dayOfWeek: frequency === "monthly" ? null : dayOfWeek,
        dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : null,
        startLocalTime: time,
        durationMinutes: Math.max(5, Number(duration) || 30),
        timezone: tz,
      });
      setTitle("");
      setMessage(`Created. ${res.occurrencesScheduled} calls on the calendar.`);
      onCreated();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Add a recurring call" />
      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Sunday family call"
      />
      <Text style={styles.fieldLabel}>Frequency</Text>
      <View style={styles.chipRow}>
        {(["weekly", "biweekly", "monthly"] as const).map((f) => (
          <Chip
            key={f}
            label={f}
            on={frequency === f}
            onPress={() => setFrequency(f)}
          />
        ))}
      </View>
      {frequency === "monthly" ? (
        <Input
          label="Day of month"
          value={dayOfMonth}
          onChangeText={setDayOfMonth}
          numeric
          keyboardType="numeric"
        />
      ) : (
        <>
          <Text style={styles.fieldLabel}>Day of week</Text>
          <View style={styles.chipRow}>
            {DAY_NAMES.map((name, idx) => (
              <Chip
                key={name}
                label={name}
                on={dayOfWeek === idx}
                onPress={() => setDayOfWeek(idx)}
              />
            ))}
          </View>
        </>
      )}
      <Input
        label="Start time (HH:MM, 24-hour)"
        value={time}
        onChangeText={setTime}
        autoCapitalize="none"
      />
      <Input
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        numeric
      />
      <Button
        label={saving ? "Saving…" : "Create rule"}
        onPress={onSubmit}
        loading={saving}
        disabled={!title.trim()}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Card>
  );
}

function RuleRow({
  rule,
  canCancel,
  onCanceled,
}: {
  rule: RecurrenceRule;
  canCancel: boolean;
  onCanceled: () => void;
}) {
  const cadence =
    rule.frequency === "monthly"
      ? `Monthly on day ${rule.day_of_month}`
      : `${rule.frequency === "biweekly" ? "Every other " : "Every "}${
          DAY_NAMES[rule.day_of_week ?? 0]
        }`;
  const time = rule.start_local_time.slice(0, 5);
  const subtitle = `${cadence} at ${time} · ${rule.duration_minutes} min`;

  const onCancel = () => {
    Alert.alert(
      "Cancel this rule?",
      `Stops generating future ${rule.title} calls and cancels any unstarted ones already scheduled.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel rule",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelRecurrenceRule(rule.id);
              onCanceled();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't cancel");
            }
          },
        },
      ]
    );
  };

  return (
    <ListItem
      title={rule.title}
      subtitle={subtitle}
      onPress={canCancel ? onCancel : undefined}
    />
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
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
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  chipRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  chipTextOn: { color: colors.primaryText },
  message: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
