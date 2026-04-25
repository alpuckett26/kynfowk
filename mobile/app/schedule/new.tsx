import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchFamilyMembers } from "@/lib/family";
import { scheduleCall } from "@/lib/calls";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { formatDate, formatTime } from "@/lib/format";
import type { FamilyMember } from "@/types/api";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      circleName: string;
      viewerMembershipId: string;
      members: FamilyMember[];
    };

const DURATION_OPTIONS = [15, 30, 45, 60] as const;

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function ScheduleNewScreen() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<Date>(defaultStart());
  const [duration, setDuration] = useState<number>(30);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      const eligible = res.members.filter(
        (m) =>
          (m.status === "active" || m.status === "invited") &&
          !m.is_deceased &&
          !m.is_placeholder &&
          !m.blocked_at &&
          m.id !== res.viewerMembershipId
      );
      setLoad({
        kind: "ok",
        circleName: res.circle.name,
        viewerMembershipId: res.viewerMembershipId,
        members: eligible,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load family";
      setLoad({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

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
  };
  const onTimeChange = (_e: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== "ios") setShowTimePicker(false);
    if (!picked) return;
    setStart((prev) => {
      const next = new Date(prev);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    });
  };

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async () => {
    if (load.kind !== "ok") return;
    setError(null);
    if (picked.size === 0) {
      setError("Pick at least one person to invite.");
      return;
    }
    if (start.getTime() < Date.now()) {
      setError("Start time must be in the future.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await scheduleCall({
        title: title.trim() || "Family Connections call",
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        participantMembershipIds: [...picked],
      });
      router.replace(`/calls/${res.callId}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Couldn't schedule";
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
          title="Couldn't load family"
          description={load.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void loadMembers()} />}
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
        <Text style={styles.eyebrow}>{load.circleName}</Text>
        <Text style={styles.title}>Schedule a call</Text>
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
                onPress={() => setDuration(opt)}
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
      </Card>

      <Card>
        <SectionHeader title={`Invite (${picked.size})`} />
        {load.members.length === 0 ? (
          <EmptyState
            title="No one to invite yet"
            description="Add family from the Family tab so you can invite them to a call."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {load.members.map((m) => {
              const subtitleParts = [
                m.relationship_label,
                m.status === "invited" ? "Pending invite" : null,
              ].filter(Boolean);
              return (
                <Toggle
                  key={m.id}
                  label={m.display_name}
                  subtitle={
                    subtitleParts.length > 0
                      ? subtitleParts.join(" · ")
                      : undefined
                  }
                  checked={picked.has(m.id)}
                  onToggle={() => togglePick(m.id)}
                />
              );
            })}
          </View>
        )}
        <Text style={styles.helper}>
          You're automatically included. Pending invitees see the call once
          they accept their invite.
        </Text>
      </Card>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <Button
        label={submitting ? "Scheduling…" : "Schedule call"}
        onPress={onSubmit}
        loading={submitting}
        disabled={load.members.length === 0}
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
  helper: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
