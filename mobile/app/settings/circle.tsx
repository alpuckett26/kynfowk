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
import { fetchFamilyMembers } from "@/lib/family";
import { updateCircleSettings } from "@/lib/profile";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      circle: { id: string; name: string; description: string | null };
      isOwner: boolean;
    };

export default function CircleSettingsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      if (res.needsOnboarding) {
        setState({
          kind: "error",
          message: "You aren't part of a family circle yet.",
        });
        return;
      }
      setState({
        kind: "ok",
        circle: res.circle,
        isOwner: res.viewerRole === "owner",
      });
      setName(res.circle.name);
      setDescription(res.circle.description ?? "");
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load circle";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (state.kind !== "ok") return false;
    return (
      name !== state.circle.name ||
      description !== (state.circle.description ?? "")
    );
  }, [state, name, description]);

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
          title="Couldn't load circle"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateCircleSettings({
        name,
        description: description.trim().length ? description : null,
      });
      await load();
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Family Circle</Text>
      </View>

      <Card>
        <SectionHeader title="Name and description" />
        {state.isOwner ? (
          <>
            <Input
              label="Circle name"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="A short note for everyone in the circle"
              multiline
            />
            <Button
              label={saving ? "Saving…" : dirty ? "Save changes" : "All saved"}
              onPress={onSave}
              loading={saving}
              disabled={!dirty}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Name</Text>
            <Text style={styles.fieldValue}>{state.circle.name}</Text>
            <Text style={styles.fieldLabel}>Description</Text>
            <Text style={styles.fieldValue}>
              {state.circle.description ?? "—"}
            </Text>
            <Text style={styles.helper}>
              Only the circle owner can edit these settings.
            </Text>
          </>
        )}
      </Card>
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
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  fieldValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  helper: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  message: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
