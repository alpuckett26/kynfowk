import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchProfile, saveProfile } from "@/lib/profile";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { ProfileResponse } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; profile: ProfileResponse["profile"] };

export default function ProfileSettingsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchProfile();
      setState({ kind: "ok", profile: res.profile });
      setName(res.profile.fullName ?? "");
      setTimezone(res.profile.timezone);
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load profile";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (state.kind !== "ok") return false;
    return (
      name !== (state.profile.fullName ?? "") ||
      timezone !== state.profile.timezone
    );
  }, [state, name, timezone]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveProfile({ fullName: name.trim(), timezone: timezone.trim() });
      await load();
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
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
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load profile"
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
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.lede}>
          Email is set by your sign-in. Name and timezone control how you
          appear to the family + when reminders fire.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Identity" />
        <Text style={styles.metaLabel}>Email</Text>
        <Text style={styles.metaValue}>{state.profile.email ?? "—"}</Text>
        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Aaron Puckett"
        />
        <Input
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          placeholder="America/Chicago"
          autoCapitalize="none"
        />
        <Text style={styles.helper}>
          IANA name. e.g. America/Chicago, Europe/London, Asia/Tokyo.
        </Text>
      </Card>

      <Button
        label={saving ? "Saving…" : dirty ? "Save changes" : "All saved"}
        onPress={onSave}
        loading={saving}
        disabled={!dirty}
      />
      {message ? <Text style={styles.status}>{message}</Text> : null}
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
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  metaValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  helper: { fontSize: fontSize.sm, color: colors.textMuted },
  status: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
