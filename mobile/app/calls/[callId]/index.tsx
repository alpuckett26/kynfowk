import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { EmptyState } from "@/components/EmptyState";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  cancelCall,
  completeCall,
  dismissRecovery,
  fetchCallDetail,
  markReminderSent,
  rescheduleCall,
  saveCallLink,
  saveCallRecap,
} from "@/lib/calls";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import { formatDate, formatTime } from "@/lib/format";
import type { CallDetailSnapshot } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; snapshot: CallDetailSnapshot };

export default function CallDetailScreen() {
  const params = useLocalSearchParams<{ callId: string }>();
  const callId = params.callId ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!callId) {
      setState({ kind: "error", message: "Missing call id" });
      return;
    }
    try {
      const res = await fetchCallDetail(callId);
      setState({ kind: "ok", snapshot: res.snapshot });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't load call";
      setState({ kind: "error", message });
    }
  }, [callId]);

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
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load call"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const { call, participants, recap, canManageFamily } = state.snapshot;
  const isLive = call.status === "live";
  const isCompleted = call.status === "completed";
  const isCanceled = call.status === "canceled";

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{state.snapshot.circle.name}</Text>
        <Text style={styles.title}>{call.title}</Text>
        <Text style={styles.meta}>
          {formatDate(call.scheduled_start)} · {formatTime(call.scheduled_start)} –{" "}
          {formatTime(call.scheduled_end)}
        </Text>
        <View style={styles.badges}>
          <Badge
            tone={
              isLive ? "live" : isCompleted ? "success" : isCanceled ? "danger" : "neutral"
            }
            label={isLive ? "Live" : call.status}
          />
          {call.show_recovery_prompt ? <Badge tone="warning" label="Follow up" /> : null}
        </View>
        <Text style={styles.meta}>{call.reminder_label}</Text>
      </View>

      {!isCompleted && !isCanceled ? (
        <Card>
          <Text style={styles.joinTitle}>Join Kynfowk video</Text>
          <Text style={styles.subtle}>
            In-app call room — no extra link needed. Camera + mic permission
            required the first time.
          </Text>
          <Button
            label={isLive ? "Re-join live call" : "Start call"}
            onPress={() => router.push(`/calls/${callId}/live`)}
          />
        </Card>
      ) : null}

      {!isCompleted && !isCanceled && canManageFamily ? (
        <ManageCallCard
          callId={callId}
          reminderStatus={call.reminder_status}
          onReminderMarked={() => void load()}
        />
      ) : null}

      {call.show_recovery_prompt && !isCompleted && !isCanceled ? (
        <RecoveryActions
          callId={callId}
          onRescheduled={(newId) => router.replace(`/calls/${newId}`)}
          onDismissed={() => void load()}
        />
      ) : null}

      {call.meeting_url ? (
        <Card>
          <SectionHeader title="Join link" />
          <Text style={styles.subtle}>
            {call.meeting_provider ?? "Meeting"} link is ready for the circle.
          </Text>
          <Text style={styles.linkText} numberOfLines={2}>
            {call.meeting_url}
          </Text>
          <Button
            label={`Open ${call.meeting_provider ?? "meeting"}`}
            onPress={() => {
              if (call.meeting_url) void Linking.openURL(call.meeting_url);
            }}
          />
        </Card>
      ) : null}

      <Card>
        <SectionHeader title={`Participants · ${participants.length}`} />
        {participants.length === 0 ? (
          <EmptyState title="No participants" />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {participants.map((p) => (
              <ListItem
                key={p.membershipId}
                title={p.displayName}
                trailing={
                  isCompleted ? (
                    <Badge
                      tone={p.attended === true ? "success" : "neutral"}
                      label={p.attended === true ? "Attended" : "Missed"}
                    />
                  ) : null
                }
              />
            ))}
          </View>
        )}
      </Card>

      {!isCompleted && !isCanceled && canManageFamily ? (
        <MeetingLinkForm
          callId={callId}
          initial={{
            provider: call.meeting_provider ?? "",
            url: call.meeting_url ?? "",
          }}
          onSaved={() => void load()}
        />
      ) : null}

      {!isCompleted && !isCanceled ? (
        <CompleteCallForm
          callId={callId}
          participants={participants}
          onSaved={() => void load()}
        />
      ) : null}

      {isCompleted ? (
        <RecapForm
          callId={callId}
          initial={{
            summary: recap?.summary ?? "",
            highlight: recap?.highlight ?? "",
            nextStep: recap?.nextStep ?? "",
          }}
          onSaved={() => void load()}
        />
      ) : null}

      {!isCompleted && !isCanceled && canManageFamily ? (
        <CancelCallButton callId={callId} onCanceled={() => router.back()} />
      ) : null}
    </Screen>
  );
}

function ManageCallCard({
  callId,
  reminderStatus,
  onReminderMarked,
}: {
  callId: string;
  reminderStatus: "pending" | "sent" | "not_needed";
  onReminderMarked: () => void;
}) {
  const [busy, setBusy] = useState<"none" | "reminder">("none");

  const onMarkReminderSent = async () => {
    setBusy("reminder");
    try {
      await markReminderSent(callId);
      onReminderMarked();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Couldn't mark reminder";
      Alert.alert("Error", m);
    } finally {
      setBusy("none");
    }
  };

  return (
    <Card>
      <SectionHeader title="Manage" />
      <Button
        label="Edit details"
        variant="secondary"
        onPress={() => router.push(`/calls/${callId}/edit`)}
      />
      {reminderStatus === "pending" ? (
        <Button
          label={busy === "reminder" ? "Marking…" : "Mark reminder sent"}
          variant="ghost"
          onPress={onMarkReminderSent}
          loading={busy === "reminder"}
        />
      ) : null}
    </Card>
  );
}

function MeetingLinkForm({
  callId,
  initial,
  onSaved,
}: {
  callId: string;
  initial: { provider: string; url: string };
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState(initial.provider);
  const [url, setUrl] = useState(initial.url);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = useMemo(
    () => provider !== initial.provider || url !== initial.url,
    [provider, url, initial]
  );

  const onSubmit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveCallLink(callId, {
        meetingProvider: provider || null,
        meetingUrl: url || null,
      });
      setMessage("Link saved.");
      onSaved();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Couldn't save";
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Meeting link" />
      <Input
        label="Provider"
        value={provider}
        onChangeText={setProvider}
        placeholder="Zoom, Meet, Teams…"
        autoCapitalize="none"
      />
      <Input
        label="URL"
        value={url}
        onChangeText={setUrl}
        placeholder="https://…"
        keyboardType="url"
        autoCapitalize="none"
      />
      <Button
        label={saving ? "Saving…" : url ? "Save link" : "Clear link"}
        onPress={onSubmit}
        loading={saving}
        disabled={!dirty}
      />
      {message ? <Text style={styles.subtle}>{message}</Text> : null}
    </Card>
  );
}

function CompleteCallForm({
  callId,
  participants,
  onSaved,
}: {
  callId: string;
  participants: CallDetailSnapshot["participants"];
  onSaved: () => void;
}) {
  const [duration, setDuration] = useState("45");
  const [attended, setAttended] = useState<Set<string>>(
    () => new Set(participants.map((p) => p.membershipId))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    const minutes = Math.max(5, Number(duration) || 45);
    setSaving(true);
    setMessage(null);
    try {
      await completeCall(callId, {
        durationMinutes: minutes,
        attendedMembershipIds: [...attended],
      });
      onSaved();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Couldn't mark complete";
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Mark complete" />
      <Input
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        numeric
      />
      <Text style={styles.subtle}>Who showed up?</Text>
      <View style={{ gap: spacing.sm }}>
        {participants.map((p) => (
          <Toggle
            key={p.membershipId}
            label={p.displayName}
            checked={attended.has(p.membershipId)}
            onToggle={() => {
              setAttended((prev) => {
                const next = new Set(prev);
                if (next.has(p.membershipId)) next.delete(p.membershipId);
                else next.add(p.membershipId);
                return next;
              });
            }}
          />
        ))}
      </View>
      <Button
        label={saving ? "Saving…" : "Mark call complete"}
        onPress={onSubmit}
        loading={saving}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
    </Card>
  );
}

function RecapForm({
  callId,
  initial,
  onSaved,
}: {
  callId: string;
  initial: { summary: string; highlight: string; nextStep: string };
  onSaved: () => void;
}) {
  const [highlight, setHighlight] = useState(initial.highlight);
  const [summary, setSummary] = useState(initial.summary);
  const [nextStep, setNextStep] = useState(initial.nextStep);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveCallRecap(callId, { summary, highlight, nextStep });
      setMessage("Recap saved.");
      onSaved();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Couldn't save recap";
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Post-call recap" />
      <Input
        label="Highlight"
        value={highlight}
        onChangeText={setHighlight}
        placeholder="Best moment from the call"
      />
      <Input
        label="Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="What did the family talk about?"
        multiline
      />
      <Input
        label="Next step"
        value={nextStep}
        onChangeText={setNextStep}
        placeholder="What's next for the circle?"
      />
      <Button
        label={saving ? "Saving…" : "Save recap"}
        onPress={onSubmit}
        loading={saving}
      />
      {message ? <Text style={styles.subtle}>{message}</Text> : null}
    </Card>
  );
}

function RecoveryActions({
  callId,
  onRescheduled,
  onDismissed,
}: {
  callId: string;
  onRescheduled: (newCallId: string) => void;
  onDismissed: () => void;
}) {
  const [busy, setBusy] = useState<"none" | "reschedule" | "dismiss">("none");

  const onReschedule = async () => {
    setBusy("reschedule");
    try {
      const res = await rescheduleCall(callId, {});
      onRescheduled(res.callId);
    } catch (e) {
      Alert.alert("Couldn't reschedule", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy("none");
    }
  };

  const onDismiss = async () => {
    setBusy("dismiss");
    try {
      await dismissRecovery(callId);
      onDismissed();
    } catch (e) {
      Alert.alert("Couldn't dismiss", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy("none");
    }
  };

  return (
    <Card>
      <SectionHeader title="Missed-call follow-up" />
      <Text style={styles.subtle}>
        Either roll this call forward a week with the same participants, or
        clear it from the missed list if it isn't happening.
      </Text>
      <Button
        label={busy === "reschedule" ? "Rescheduling…" : "Reschedule for next week"}
        onPress={onReschedule}
        loading={busy === "reschedule"}
        disabled={busy !== "none"}
      />
      <Button
        label={busy === "dismiss" ? "Clearing…" : "Clear from missed list"}
        variant="secondary"
        onPress={onDismiss}
        loading={busy === "dismiss"}
        disabled={busy !== "none"}
      />
    </Card>
  );
}

function CancelCallButton({
  callId,
  onCanceled,
}: {
  callId: string;
  onCanceled: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const onPress = () => {
    Alert.alert(
      "Cancel this call?",
      "Reminders and notifications will be cleared. This can't be undone.",
      [
        { text: "Keep call", style: "cancel" },
        {
          text: "Cancel call",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await cancelCall(callId);
              onCanceled();
            } catch (error) {
              const m = error instanceof Error ? error.message : "Couldn't cancel";
              Alert.alert("Error", m);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return <Button label="Cancel call" variant="danger" onPress={onPress} loading={busy} />;
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
  meta: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19 },
  badges: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  subtle: { fontSize: fontSize.sm, color: colors.textMuted },
  joinTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger },
});
