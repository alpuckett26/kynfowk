import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
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
  fetchPrayerIntentions,
  postPrayerIntention,
  respondToPrayer,
  setPrayerStatus,
} from "@/lib/prayer";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { relativeTime } from "@/lib/format";
import type { PrayerIntention } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      intentions: PrayerIntention[];
      viewerMembershipId: string;
    };

export default function PrayerScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchPrayerIntentions();
      if (res.needsOnboarding) {
        setState({ kind: "error", message: "No circle yet." });
        return;
      }
      setState({
        kind: "ok",
        intentions: res.intentions ?? [],
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

  const onPost = async () => {
    if (!composer.trim()) return;
    setPosting(true);
    try {
      await postPrayerIntention(composer.trim());
      setComposer("");
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't post");
    } finally {
      setPosting(false);
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
          title="Couldn't load prayer chain"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const open = state.intentions.filter((i) => i.status === "open");
  const answered = state.intentions.filter((i) => i.status === "answered");

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Faith</Text>
        <Text style={styles.title}>Prayer chain</Text>
        <Text style={styles.lede}>
          Share what's on your heart. The family can offer a kind word in
          response.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Add an intention" />
        <Input
          label="What's on your heart?"
          value={composer}
          onChangeText={setComposer}
          placeholder="A friend, a worry, a thanks…"
          multiline
        />
        <Button
          label={posting ? "Posting…" : "Post intention"}
          onPress={onPost}
          loading={posting}
          disabled={!composer.trim()}
        />
      </Card>

      <Card>
        <SectionHeader title={`Open · ${open.length}`} />
        {open.length === 0 ? (
          <EmptyState
            title="None right now"
            description="Add one above when something comes to mind."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {open.map((i) => (
              <IntentionCard
                key={i.id}
                intention={i}
                viewerMembershipId={state.viewerMembershipId}
                onChanged={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>

      {answered.length > 0 ? (
        <Card>
          <SectionHeader title={`Answered · ${answered.length}`} />
          <View style={{ gap: spacing.md }}>
            {answered.map((i) => (
              <IntentionCard
                key={i.id}
                intention={i}
                viewerMembershipId={state.viewerMembershipId}
                onChanged={() => void load()}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function IntentionCard({
  intention,
  viewerMembershipId,
  onChanged,
}: {
  intention: PrayerIntention;
  viewerMembershipId: string;
  onChanged: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"none" | "respond" | "answered" | "archive">(
    "none"
  );

  const isAuthor = intention.authorMembershipId === viewerMembershipId;

  const onRespond = async () => {
    if (!reply.trim()) return;
    setBusy("respond");
    try {
      await respondToPrayer(intention.id, reply.trim());
      setReply("");
      onChanged();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't respond");
    } finally {
      setBusy("none");
    }
  };

  const onMarkAnswered = async () => {
    setBusy("answered");
    try {
      await setPrayerStatus(intention.id, "answered");
      onChanged();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy("none");
    }
  };

  const onArchive = () => {
    Alert.alert(
      "Archive intention?",
      "It won't appear in the active list anymore.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setBusy("archive");
            try {
              await setPrayerStatus(intention.id, "archived");
              onChanged();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't archive");
            } finally {
              setBusy("none");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.intentionBox}>
      <View style={styles.intentionHead}>
        <Text style={styles.author}>{intention.authorDisplayName}</Text>
        <Text style={styles.timestamp}>{relativeTime(intention.createdAt)}</Text>
      </View>
      <Text style={styles.body}>{intention.body}</Text>

      {intention.responses.length > 0 ? (
        <View style={styles.responsesBlock}>
          {intention.responses.map((r) => (
            <View key={r.id} style={styles.responseRow}>
              <Text style={styles.responseAuthor}>{r.displayName}</Text>
              {r.message ? (
                <Text style={styles.responseText}>{r.message}</Text>
              ) : (
                <Text style={styles.responseText}>🙏 praying for you</Text>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {intention.status === "open" ? (
        <View style={styles.responseEntry}>
          <Input
            label="Offer support"
            value={reply}
            onChangeText={setReply}
            placeholder="A short note (or leave empty for 🙏)"
            multiline
          />
          <Button
            label={busy === "respond" ? "Posting…" : "Send"}
            variant="secondary"
            onPress={onRespond}
            loading={busy === "respond"}
          />
        </View>
      ) : null}

      {isAuthor && intention.status === "open" ? (
        <View style={styles.actionsRow}>
          <Button
            label={busy === "answered" ? "Saving…" : "Mark answered"}
            variant="ghost"
            onPress={onMarkAnswered}
            loading={busy === "answered"}
          />
          <Button
            label={busy === "archive" ? "Archiving…" : "Archive"}
            variant="ghost"
            onPress={onArchive}
            loading={busy === "archive"}
          />
        </View>
      ) : null}

      {intention.status === "answered" ? (
        <Badge tone="success" label="Answered 🙌" />
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
  intentionBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  intentionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  author: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  timestamp: { fontSize: fontSize.xs, color: colors.textMuted },
  body: {
    fontSize: fontSize.md,
    color: colors.text,
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
  actionsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
