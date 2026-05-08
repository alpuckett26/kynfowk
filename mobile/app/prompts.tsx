import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  closePrompt,
  createPrompt,
  fetchPrompts,
  respondToPrompt,
} from "@/lib/prompts";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { relativeTime } from "@/lib/format";
import type { FamilyPrompt, FamilyPromptKind } from "@/types/api";

const KIND_LABELS: Record<FamilyPromptKind, string> = {
  memory: "Memory",
  open_text: "Open question",
  photo_request: "Photo request",
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      prompts: FamilyPrompt[];
      isOwner: boolean;
      viewerMembershipId: string;
    };

export default function PromptsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetchPrompts();
      if (res.needsOnboarding) {
        setState({ kind: "error", message: "No circle yet." });
        return;
      }
      setState({
        kind: "ok",
        prompts: res.prompts ?? [],
        isOwner: res.viewerRole === "owner",
        viewerMembershipId: res.viewerMembershipId ?? "",
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
          title="Couldn't load prompts"
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
        <Text style={styles.eyebrow}>Activity</Text>
        <Text style={styles.title}>Family prompts</Text>
        <Text style={styles.lede}>
          Spark memories with text or photo prompts. Everyone can answer.
        </Text>
      </View>

      {state.isOwner ? <CreateForm onCreated={() => void load()} /> : null}

      <Card>
        <SectionHeader title={`Prompts · ${state.prompts.length}`} />
        {state.prompts.length === 0 ? (
          <EmptyState
            title="No prompts yet"
            description={
              state.isOwner
                ? "Add one above to get the family talking."
                : "The owner hasn't added prompts yet."
            }
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {state.prompts.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                viewerMembershipId={state.viewerMembershipId}
                isOwner={state.isOwner}
                onChanged={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [kind, setKind] = useState<FamilyPromptKind>("memory");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setMessage(null);
    if (!text.trim()) {
      setMessage("Add prompt text.");
      return;
    }
    setSaving(true);
    try {
      await createPrompt({ kind, promptText: text.trim() });
      setText("");
      onCreated();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Add a prompt" />
      <Text style={styles.fieldLabel}>Kind</Text>
      <View style={styles.chipRow}>
        {(["memory", "open_text", "photo_request"] as const).map((k) => (
          <Pressable
            key={k}
            style={[styles.chip, kind === k && styles.chipOn]}
            onPress={() => setKind(k)}
          >
            <Text style={[styles.chipText, kind === k && styles.chipTextOn]}>
              {KIND_LABELS[k]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        label="Prompt"
        value={text}
        onChangeText={setText}
        placeholder={
          kind === "memory"
            ? "Share a favorite Christmas morning memory…"
            : kind === "open_text"
              ? "What's something the family doesn't know about you?"
              : "Send a photo of your morning view"
        }
        multiline
      />
      <Button
        label={saving ? "Saving…" : "Add prompt"}
        onPress={onSubmit}
        loading={saving}
        disabled={!text.trim()}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
    </Card>
  );
}

function PromptCard({
  prompt,
  viewerMembershipId,
  isOwner,
  onChanged,
}: {
  prompt: FamilyPrompt;
  viewerMembershipId: string;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const myResponse = prompt.responses.find(
    (r) => r.membershipId === viewerMembershipId
  );
  const [text, setText] = useState(myResponse?.textResponse ?? "");
  const [busy, setBusy] = useState<"none" | "saving" | "photo" | "close">("none");

  const onSubmitText = async () => {
    setBusy("saving");
    try {
      await respondToPrompt(prompt.id, { textResponse: text });
      onChanged();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy("none");
    }
  };

  const onSubmitPhoto = async () => {
    // M98 — photo upload disabled in iOS demolition build.
    // Re-enable when expo-image-picker is reintroduced (M99).
    Alert.alert(
      "Photo upload coming soon",
      "Photo prompts will return in the next build. Please respond with text for now."
    );
    setBusy("none");
  };

  const onClose = () => {
    Alert.alert(
      "Close this prompt?",
      "Members won't be able to add new responses.",
      [
        { text: "Keep open", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: async () => {
            setBusy("close");
            try {
              await closePrompt(prompt.id);
              onChanged();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't close");
            } finally {
              setBusy("none");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.promptBox}>
      <View style={styles.promptHead}>
        <Badge label={KIND_LABELS[prompt.kind]} />
        {prompt.closedAt ? (
          <Badge tone="neutral" label="Closed" />
        ) : (
          <Text style={styles.timestamp}>{relativeTime(prompt.createdAt)}</Text>
        )}
      </View>
      <Text style={styles.promptText}>{prompt.promptText}</Text>

      {prompt.responses.length > 0 ? (
        <View style={styles.responsesBlock}>
          {prompt.responses.map((r) => (
            <View key={r.id} style={styles.responseRow}>
              <Text style={styles.responseAuthor}>{r.displayName}</Text>
              {r.textResponse ? (
                <Text style={styles.responseText}>{r.textResponse}</Text>
              ) : null}
              {r.photoUrl ? (
                <Text style={styles.subtle}>📷 photo attached</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!prompt.closedAt ? (
        <View style={styles.responseEntry}>
          {prompt.kind === "photo_request" ? (
            <Button
              label={busy === "photo" ? "Uploading…" : "Add photo"}
              variant="secondary"
              onPress={onSubmitPhoto}
              loading={busy === "photo"}
            />
          ) : (
            <>
              <Input
                label={myResponse ? "Your response (edit)" : "Your response"}
                value={text}
                onChangeText={setText}
                multiline
              />
              <Button
                label={busy === "saving" ? "Saving…" : myResponse ? "Update" : "Respond"}
                onPress={onSubmitText}
                loading={busy === "saving"}
                disabled={!text.trim()}
              />
            </>
          )}
        </View>
      ) : null}

      {isOwner && !prompt.closedAt ? (
        <Button
          label={busy === "close" ? "Closing…" : "Close prompt"}
          variant="ghost"
          onPress={onClose}
          loading={busy === "close"}
        />
      ) : null}
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
  promptBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  promptHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  promptText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    lineHeight: 21,
  },
  responsesBlock: { gap: spacing.sm },
  responseRow: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 2,
  },
  responseAuthor: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  responseText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 19 },
  responseEntry: { gap: spacing.sm },
  subtle: { fontSize: fontSize.sm, color: colors.textMuted },
  timestamp: { fontSize: fontSize.xs, color: colors.textMuted },
  errorText: { fontSize: fontSize.sm, color: colors.danger },
});
