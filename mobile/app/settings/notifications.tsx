import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Toggle } from "@/components/Toggle";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  fetchNotifications,
  saveNotificationPrefs,
} from "@/lib/notifications";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { NotificationPreferenceSettings } from "@/types/api";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; prefs: NotificationPreferenceSettings };

export default function NotificationSettingsScreen() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [draft, setDraft] = useState<NotificationPreferenceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load_ = useCallback(async () => {
    try {
      const res = await fetchNotifications({ read: "all" });
      setLoad({ kind: "ok", prefs: res.preferences });
      setDraft(res.preferences);
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load preferences";
      setLoad({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load_();
  }, [load_]);

  const dirty = useMemo(() => {
    if (load.kind !== "ok" || !draft) return false;
    const p = load.prefs;
    return (
      p.inAppEnabled !== draft.inAppEnabled ||
      p.emailEnabled !== draft.emailEnabled ||
      p.weeklyDigestEnabled !== draft.weeklyDigestEnabled ||
      p.reminder24hEnabled !== draft.reminder24hEnabled ||
      p.reminder15mEnabled !== draft.reminder15mEnabled ||
      p.startingNowEnabled !== draft.startingNowEnabled ||
      p.pushEnabled !== draft.pushEnabled ||
      p.quietHoursStart !== draft.quietHoursStart ||
      p.quietHoursEnd !== draft.quietHoursEnd ||
      p.timezone !== draft.timezone
    );
  }, [load, draft]);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveNotificationPrefs(draft);
      setLoad({ kind: "ok", prefs: draft });
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  if (load.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (load.kind === "error" || !draft) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load preferences"
          description={load.kind === "error" ? load.message : ""}
          action={<Button label="Try again" variant="secondary" onPress={() => void load_()} />}
        />
      </Screen>
    );
  }

  const setField = <K extends keyof NotificationPreferenceSettings>(
    key: K,
    value: NotificationPreferenceSettings[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMessage(null);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Notification rhythm</Text>
        <Text style={styles.lede}>
          Choose how Kynfowk should nudge you. In-app shows up here in your
          inbox; email and push reach you across the day.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Channels" />
        <Toggle
          label="In-app"
          subtitle="Show up in your inbox"
          checked={draft.inAppEnabled}
          onToggle={() => setField("inAppEnabled", !draft.inAppEnabled)}
        />
        <Toggle
          label="Email"
          subtitle="Send to the email on your account"
          checked={draft.emailEnabled}
          onToggle={() => setField("emailEnabled", !draft.emailEnabled)}
        />
        <Toggle
          label="Push"
          subtitle="Phone notifications (M8)"
          checked={draft.pushEnabled}
          onToggle={() => setField("pushEnabled", !draft.pushEnabled)}
          disabled
        />
      </Card>

      <Card>
        <SectionHeader title="What to send" />
        <Toggle
          label="24-hour reminder"
          checked={draft.reminder24hEnabled}
          onToggle={() => setField("reminder24hEnabled", !draft.reminder24hEnabled)}
        />
        <Toggle
          label="15-minute reminder"
          checked={draft.reminder15mEnabled}
          onToggle={() => setField("reminder15mEnabled", !draft.reminder15mEnabled)}
        />
        <Toggle
          label="Starting now"
          checked={draft.startingNowEnabled}
          onToggle={() => setField("startingNowEnabled", !draft.startingNowEnabled)}
        />
        <Toggle
          label="Weekly digest"
          subtitle="A short summary every Sunday"
          checked={draft.weeklyDigestEnabled}
          onToggle={() => setField("weeklyDigestEnabled", !draft.weeklyDigestEnabled)}
        />
      </Card>

      <Card>
        <SectionHeader title="Quiet hours" />
        <Text style={styles.metaLabel}>Start</Text>
        <HourPicker
          value={draft.quietHoursStart}
          onChange={(v) => setField("quietHoursStart", v)}
        />
        <Text style={styles.metaLabel}>End</Text>
        <HourPicker
          value={draft.quietHoursEnd}
          onChange={(v) => setField("quietHoursEnd", v)}
        />
        <Text style={styles.helper}>
          Both off = no quiet hours. End hour is the first hour back on.
        </Text>
      </Card>

      <Card>
        <SectionHeader title="Timezone" />
        <Input
          value={draft.timezone}
          onChangeText={(v) => setField("timezone", v)}
          placeholder="America/Chicago"
          autoCapitalize="none"
        />
        <Text style={styles.helper}>
          Use an IANA name like America/Chicago, Europe/London, Asia/Tokyo.
        </Text>
      </Card>

      <Button
        label={saving ? "Saving…" : dirty ? "Save preferences" : "All saved"}
        onPress={onSave}
        loading={saving}
        disabled={!dirty}
      />
      {message ? <Text style={styles.status}>{message}</Text> : null}
    </Screen>
  );
}

function HourPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <View style={hourStyles.row}>
      <Pressable
        style={[hourStyles.chip, value === null && hourStyles.chipOn]}
        onPress={() => onChange(null)}
      >
        <Text style={[hourStyles.chipText, value === null && hourStyles.chipTextOn]}>
          Off
        </Text>
      </Pressable>
      {HOURS.map((h) => {
        const on = value === h;
        return (
          <Pressable
            key={h}
            style={[hourStyles.chip, on && hourStyles.chipOn]}
            onPress={() => onChange(h)}
          >
            <Text style={[hourStyles.chipText, on && hourStyles.chipTextOn]}>
              {hourLabel(h)}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  helper: { fontSize: fontSize.sm, color: colors.textMuted },
  status: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});

const hourStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
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
});
