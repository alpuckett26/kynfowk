import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

interface TriviaQuestion {
  question: string;
  correct: string;
  choices: string[];
}

interface TriviaState {
  phase: "question" | "reveal" | "done";
  questionIndex: number;
  questions: TriviaQuestion[];
  buzzerId: string | null;
  scores: Record<string, number>;
  players: Array<{ membershipId: string; displayName: string }>;
}

export type TriviaAction =
  | { type: "trivia_state"; state: TriviaState }
  | { type: "trivia_buzz"; from: string };

function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&eacute;/g, "é");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  {
    question: "Which planet is known as the Red Planet?",
    correct: "Mars",
    choices: ["Mars", "Venus", "Jupiter", "Saturn"],
  },
  {
    question: "What is the largest ocean on Earth?",
    correct: "Pacific Ocean",
    choices: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"],
  },
  {
    question: "Who painted the Mona Lisa?",
    correct: "Leonardo da Vinci",
    choices: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
  },
  {
    question: "What is the chemical symbol for gold?",
    correct: "Au",
    choices: ["Go", "Gd", "Au", "Ag"],
  },
  {
    question: "How many continents are there?",
    correct: "7",
    choices: ["5", "6", "7", "8"],
  },
];

export function GameTrivia({
  membershipId,
  isHost,
  players,
  onSend,
  onMessage,
  onEnd,
}: {
  membershipId: string;
  isHost: boolean;
  players: Array<{ membershipId: string; displayName: string }>;
  onSend: (action: TriviaAction) => void;
  onMessage: (handler: (action: TriviaAction) => void) => () => void;
  onEnd: () => void;
}) {
  const [gameState, setGameState] = useState<TriviaState | null>(null);
  const [myBuzzed, setMyBuzzed] = useState(false);
  const [loading, setLoading] = useState(isHost);
  const [revealTimer, setRevealTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stateRef = useRef<TriviaState | null>(null);

  // Host: fetch questions + initialize state
  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    (async () => {
      let questions: TriviaQuestion[] = FALLBACK_QUESTIONS;
      try {
        const res = await fetch(
          "https://opentdb.com/api.php?amount=10&type=multiple&difficulty=easy"
        );
        const data = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          questions = data.results.map(
            (q: {
              question: string;
              correct_answer: string;
              incorrect_answers: string[];
            }) => ({
              question: decodeHtml(q.question),
              correct: decodeHtml(q.correct_answer),
              choices: shuffle([
                decodeHtml(q.correct_answer),
                ...q.incorrect_answers.map(decodeHtml),
              ]),
            })
          );
        }
      } catch {
        // Use fallback
      }
      if (cancelled) return;
      const initial: TriviaState = {
        phase: "question",
        questionIndex: 0,
        questions,
        buzzerId: null,
        scores: Object.fromEntries(players.map((p) => [p.membershipId, 0])),
        players,
      };
      stateRef.current = initial;
      setGameState(initial);
      setLoading(false);
      onSend({ type: "trivia_state", state: initial });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Subscribe
  useEffect(() => {
    const unsub = onMessage((payload) => {
      if (payload.type === "trivia_state") {
        stateRef.current = payload.state;
        setGameState(payload.state);
        setMyBuzzed(false);
        setLoading(false);
      } else if (
        payload.type === "trivia_buzz" &&
        isHost &&
        stateRef.current?.phase === "question" &&
        !stateRef.current.buzzerId
      ) {
        const newState: TriviaState = {
          ...stateRef.current,
          buzzerId: payload.from,
          phase: "reveal",
          scores: {
            ...stateRef.current.scores,
            [payload.from]: (stateRef.current.scores[payload.from] ?? 0) + 1,
          },
        };
        stateRef.current = newState;
        setGameState(newState);
        onSend({ type: "trivia_state", state: newState });
      }
    });
    return unsub;
  }, [onMessage, isHost, onSend]);

  // Reveal timer (host only)
  const advanceQuestion = useCallback(() => {
    const prev = stateRef.current;
    if (!prev) return;
    const nextIndex = prev.questionIndex + 1;
    if (nextIndex >= prev.questions.length) {
      const done: TriviaState = { ...prev, phase: "done" };
      stateRef.current = done;
      setGameState(done);
      onSend({ type: "trivia_state", state: done });
      return;
    }
    const next: TriviaState = {
      ...prev,
      phase: "question",
      questionIndex: nextIndex,
      buzzerId: null,
    };
    stateRef.current = next;
    setGameState(next);
    onSend({ type: "trivia_state", state: next });
  }, [onSend]);

  useEffect(() => {
    if (gameState?.phase !== "reveal" || !isHost) return;
    setRevealTimer(4);
    timerRef.current = setInterval(() => {
      setRevealTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          advanceQuestion();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.phase, gameState?.questionIndex, isHost, advanceQuestion]);

  const onBuzz = () => {
    if (myBuzzed || gameState?.phase !== "question" || gameState.buzzerId) return;
    setMyBuzzed(true);
    onSend({ type: "trivia_buzz", from: membershipId });
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.subtle}>Loading trivia questions…</Text>
      </Card>
    );
  }
  if (!gameState) {
    return (
      <Card>
        <Text style={styles.subtle}>Waiting for the host to start…</Text>
      </Card>
    );
  }

  const q = gameState.questions[gameState.questionIndex];
  const buzzerName = gameState.buzzerId
    ? gameState.players.find((p) => p.membershipId === gameState.buzzerId)
        ?.displayName ?? "Someone"
    : null;

  if (gameState.phase === "done") {
    const sorted = [...gameState.players].sort(
      (a, b) =>
        (gameState.scores[b.membershipId] ?? 0) -
        (gameState.scores[a.membershipId] ?? 0)
    );
    return (
      <Card>
        <Text style={styles.eyebrow}>Family Trivia</Text>
        <Text style={styles.title}>Game over!</Text>
        <View style={styles.scoresBlock}>
          {sorted.map((p) => (
            <View
              key={p.membershipId}
              style={[
                styles.scoreRow,
                p.membershipId === membershipId && styles.scoreRowMine,
              ]}
            >
              <Text style={styles.scoreName}>{p.displayName}</Text>
              <Text style={styles.scoreVal}>
                {gameState.scores[p.membershipId] ?? 0} pts
              </Text>
            </View>
          ))}
        </View>
        <Button label="Back to call" variant="secondary" onPress={onEnd} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Family Trivia</Text>
        <Text style={styles.subtle}>
          Q{gameState.questionIndex + 1} / {gameState.questions.length}
        </Text>
      </View>
      <Text style={styles.question}>{q?.question}</Text>

      {gameState.phase === "question" ? (
        <>
          <Pressable
            style={[styles.buzzBtn, myBuzzed && styles.buzzBtnPressed]}
            onPress={onBuzz}
            disabled={myBuzzed || !!gameState.buzzerId}
          >
            <Text style={styles.buzzText}>
              {myBuzzed ? "Buzzed in!" : "Buzz in!"}
            </Text>
          </Pressable>
          <Text style={styles.subtle}>
            Say your answer out loud when you buzz in
          </Text>
        </>
      ) : (
        <View style={styles.revealBlock}>
          {buzzerName ? (
            <Text style={styles.revealLine}>
              <Text style={styles.bold}>{buzzerName}</Text> buzzed in!
            </Text>
          ) : null}
          <Text style={styles.revealLine}>
            Answer: <Text style={styles.bold}>{q?.correct}</Text>
          </Text>
          {isHost ? (
            <Text style={styles.subtle}>Next question in {revealTimer}s…</Text>
          ) : null}
        </View>
      )}

      <View style={styles.miniScoreboard}>
        {gameState.players.map((p) => (
          <View
            key={p.membershipId}
            style={[
              styles.miniScore,
              p.membershipId === membershipId && styles.miniScoreMine,
            ]}
          >
            <Text style={styles.miniName}>
              {p.displayName.split(" ")[0]}
            </Text>
            <Text style={styles.miniPts}>
              {gameState.scores[p.membershipId] ?? 0}
            </Text>
          </View>
        ))}
      </View>

      <Button label="End game" variant="ghost" onPress={onEnd} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  question: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    lineHeight: 22,
  },
  subtle: { fontSize: fontSize.sm, color: colors.textMuted },
  buzzBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  buzzBtnPressed: { opacity: 0.5 },
  buzzText: {
    color: colors.primaryText,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  revealBlock: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  revealLine: { fontSize: fontSize.md, color: colors.text },
  bold: { fontWeight: fontWeight.bold },
  miniScoreboard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  miniScore: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    gap: 4,
  },
  miniScoreMine: { backgroundColor: colors.accent + "22" },
  miniName: { fontSize: fontSize.xs, color: colors.text },
  miniPts: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  scoresBlock: { gap: spacing.xs, marginVertical: spacing.sm },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
  scoreRowMine: { backgroundColor: colors.accent + "22" },
  scoreName: { fontSize: fontSize.sm, color: colors.text },
  scoreVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
});
