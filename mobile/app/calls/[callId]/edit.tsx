import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { editCallDetails, fetchCallDetail } from "@/lib/calls";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { formatDate, formatTime } from "@/lib/format";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      circleName: string;
      title: string;
      start: Date;
      durationMinutes: number;
      canManage: boolean;
      isScheduled: boolean;
    };

const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

export default function EditCallScreen() {
  const params = useLocalSearchParams<{ callId: string }>();
  const callId = params.callId ?? "";
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [duration, setDuration] = useState<number>(30);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!callId) {
      setLoad({ kind: "error", message: "Missing call id" });
      return;
    }
    try {
      const res = await fetchCallDetail(callId);
      const c = res.snapshot.call;
      const startDate = new Date(c.scheduled_start);
      const endDate = new Date(c.scheduled_end);
      const minutes = Math.max(
        15,
        Math.round((endDate.getTime() - startDate.getTime()) / 60_000)
      );
      const canManage =
        res.snapshot.canManageFamily && c.status === "scheduled";
      setLoad({
        kind: "ok",
        circleName: res.snapshot.circle.name,
        title: c.title,
        start: startDate,
        durationMinutes: minutes,
        canManage,
        isScheduled: c.status === "scheduled",
      });
      setTitle(c.title);
      setStart(startDate);
      setDuration(minutes);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load call";
      setLoad({ kind: "error", message });
    }
  }, [callId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const end = useMemo(
    () => new Date(start.getTime() + duration * 60_000),
    [start, duration]
  );

  const onDateChange = (_e: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (!picked) return;
    setStart((prev) => {
      const next = new Date(prev);
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      return next;
    });
    setReschedule(true);
  };
  const onTimeChange = (_e: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== "ios") setShowTimePicker(false);
    if (!picked) return;
    setStart((prev) => {
      const next = new Date(prev);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    });
    setReschedule(true);
  };

  const onSubmit = async () => {
    if (load.kind !== "ok") return;
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a title.");
      return;
    }
    if (reschedule && start.getTime() <= Date.now()) {
      setError("Pick a future time.");
      return;
    }
    setSubmitting(true);
    try {
      await editCallDetails(callId, {
        title: trimmed,
        scheduledStart: reschedule ? start.toISOString() : undefined,
        scheduledEnd: reschedule ? end.toISOString() : undefined,
      });
      router.replace(`/calls/${callId}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Couldn't save";
      setError(m);
    } finally {
      setSubmitting(false);
    }
  };

  if (load.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (load.kind === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load call"
          description={load.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void fetch()} />}
        />
      </Screen>
    );
  }
  if (!load.canManage) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Can't edit this call"
          description={
            load.isScheduled
              ? "Only the circle owner can edit calls."
              : "Calls that have started or finished can't be edited."
          }
        />
      </Screen>
    );
  }

  const dirty = title.trim() !== load.title || reschedule;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{load.circleName}</Text>
        <Text style={styles.title}>Edit call</Text>
      </View>

      <Card>
        <SectionHeader title="Details" />
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Family Connections call"
        />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Pressable style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.pickerText}>{formatDate(start.toISOString())}</Text>
            </Pressable>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>Start time</Text>
            <Pressable style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.pickerText}>{formatTime(start.toISOString())}</Text>
            </Pressable>
          </View>
        </View>
        {showDatePicker ? (
          <DateTimePicker
            value={start}
            mode="date"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        ) : null}
        {showTimePicker ? (
          <DateTimePicker
            value={start}
            mode="time"
            onChange={onTimeChange}
          />
        ) : null}
        <Text style={styles.fieldLabel}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((opt) => {
            const on = duration === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.durationChip, on && styles.durationChipOn]}
                onPress={() => {
                  setDuration(opt);
                  setReschedule(true);
                }}
              >
                <Text style={[styles.durationText, on && styles.durationTextOn]}>
                  {opt} min
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helper}>
          Ends at {formatTime(end.toISOString())} on {formatDate(end.toISOString())}.
        </Text>
        {reschedule ? (
          <Text style={styles.helper}>
            Saving will reset the reminder schedule and notify the circle.
          </Text>
        ) : null}
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        label={submitting ? "Saving…" : "Save changes"}
        onPress={onSubmit}
        loading={submitting}
        disabled={!dirty}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
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
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateCol: { flex: 1, gap: 4 },
  pickerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  durationRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  durationChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  durationChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  durationTextOn: { color: colors.primaryText },
  helper: { fontSize: fontSize.sm, color: colors.textMuted },
  errorText: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
