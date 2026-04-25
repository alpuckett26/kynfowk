import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchActivePoll, fetchPollResults, respondToPoll } from "@/lib/polls";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { FamilyPoll, FamilyPollResult } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      activePoll: FamilyPoll | null;
      results: FamilyPollResult[];
    };

export default function PollsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [activeRes, resultsRes] = await Promise.all([
        fetchActivePoll(),
        fetchPollResults(),
      ]);
      setState({
        kind: "ok",
        activePoll: activeRes.poll,
        results: resultsRes.results,
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load polls";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onAnswer = async (pollId: string, choice: "a" | "b") => {
    setSubmittingId(pollId);
    try {
      await respondToPoll(pollId, choice);
      await load();
    } finally {
      setSubmittingId(null);
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
          title="Couldn't load polls"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Polls</Text>
        <Text style={styles.title}>This or that</Text>
        <Text style={styles.lede}>
          Quick family questions. Answer one, see how the rest of the circle
          voted.
        </Text>
      </View>

      {state.activePoll ? (
        <Card>
          <SectionHeader title="Your turn" />
          <Text style={styles.question}>{state.activePoll.question}</Text>
          <View style={styles.choiceRow}>
            <Pressable
              style={styles.choiceBtn}
              onPress={() => void onAnswer(state.activePoll!.id, "a")}
              disabled={submittingId !== null}
            >
              {state.activePoll.emoji_a ? (
                <Text style={styles.choiceEmoji}>{state.activePoll.emoji_a}</Text>
              ) : null}
              <Text style={styles.choiceText}>{state.activePoll.option_a}</Text>
            </Pressable>
            <Pressable
              style={styles.choiceBtn}
              onPress={() => void onAnswer(state.activePoll!.id, "b")}
              disabled={submittingId !== null}
            >
              {state.activePoll.emoji_b ? (
                <Text style={styles.choiceEmoji}>{state.activePoll.emoji_b}</Text>
              ) : null}
              <Text style={styles.choiceText}>{state.activePoll.option_b}</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Family votes" />
        {state.results.length === 0 ? (
          <EmptyState
            title="No votes yet"
            description="The first answers from your circle will show up here as a side-by-side."
          />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {state.results.map((r) => (
              <PollResult key={r.id} result={r} />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function PollResult({ result }: { result: FamilyPollResult }) {
  const total = result.count_a + result.count_b;
  const pctA = total > 0 ? Math.round((result.count_a / total) * 100) : 0;
  const pctB = total > 0 ? 100 - pctA : 0;
  return (
    <View style={resultStyles.row}>
      <Text style={resultStyles.q}>{result.question}</Text>
      <View style={resultStyles.barRow}>
        <Text style={resultStyles.label} numberOfLines={1}>
          {result.emoji_a ?? ""} {result.option_a}
        </Text>
        <View style={resultStyles.barTrack}>
          <View style={[resultStyles.barFill, { width: `${pctA}%` }]} />
        </View>
        <Text style={resultStyles.pct}>{pctA}%</Text>
      </View>
      <View style={resultStyles.barRow}>
        <Text style={resultStyles.label} numberOfLines={1}>
          {result.emoji_b ?? ""} {result.option_b}
        </Text>
        <View style={resultStyles.barTrack}>
          <View
            style={[resultStyles.barFill, resultStyles.barFillB, { width: `${pctB}%` }]}
          />
        </View>
        <Text style={resultStyles.pct}>{pctB}%</Text>
      </View>
      {result.viewer_choice ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Badge
            tone="success"
            label={`You voted ${result.viewer_choice === "a" ? result.option_a : result.option_b}`}
          />
        </View>
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
  question: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 24,
  },
  choiceRow: { flexDirection: "row", gap: spacing.sm },
  choiceBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceEmoji: { fontSize: 32 },
  choiceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
  },
});

const resultStyles = StyleSheet.create({
  row: { gap: spacing.sm },
  q: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.primary },
  barFillB: { backgroundColor: colors.accent },
  pct: {
    width: 40,
    textAlign: "right",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
