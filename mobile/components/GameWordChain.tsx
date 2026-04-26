import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

interface WordChainState {
  phase: "playing" | "done";
  chain: string[];
  currentPlayerId: string;
  players: Array<{ membershipId: string; displayName: string; active: boolean }>;
  scores: Record<string, number>;
  turnStarted: number;
  winner: string | null;
}

export type WordChainAction =
  | { type: "wc_state"; state: WordChainState }
  | { type: "wc_word"; from: string; word: string }
  | { type: "wc_timeout"; from: string };

const TURN_SECONDS = 15;

export function GameWordChain({
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
  onSend: (action: WordChainAction) => void;
  onMessage: (handler: (action: WordChainAction) => void) => () => void;
  onEnd: () => void;
}) {
  const [gameState, setGameState] = useState<WordChainState | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stateRef = useRef<WordChainState | null>(null);

  // Host: init
  useEffect(() => {
    if (!isHost) return;
    const initial: WordChainState = {
      phase: "playing",
      chain: ["FAMILY"],
      currentPlayerId: players[0].membershipId,
      players: players.map((p) => ({ ...p, active: true })),
      scores: Object.fromEntries(players.map((p) => [p.membershipId, 0])),
      turnStarted: Date.now(),
      winner: null,
    };
    stateRef.current = initial;
    setGameState(initial);
    onSend({ type: "wc_state", state: initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Subscribe
  useEffect(() => {
    const unsub = onMessage((payload) => {
      if (payload.type === "wc_state") {
        stateRef.current = payload.state;
        setGameState(payload.state);
        setTimeLeft(TURN_SECONDS);
        setInput("");
        setError(null);
      } else if (payload.type === "wc_word" && isHost) {
        processWord(payload.from, payload.word);
      } else if (payload.type === "wc_timeout" && isHost) {
        processTimeout(payload.from);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMessage, isHost]);

  // Countdown
  useEffect(() => {
    if (!gameState || gameState.phase !== "playing") return;
    const elapsed = Math.floor((Date.now() - gameState.turnStarted) / 1000);
    setTimeLeft(Math.max(0, TURN_SECONDS - elapsed));
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (isHost) processTimeout(gameState.currentPlayerId);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerId, gameState?.turnStarted]);

  function processWord(fromId: string, word: string) {
    const state = stateRef.current;
    if (!state || state.currentPlayerId !== fromId || state.phase !== "playing") return;
    const lastWord = state.chain[state.chain.length - 1];
    const lastLetter = lastWord.slice(-1).toUpperCase();
    const clean = word.trim().toUpperCase();
    if (!clean || clean[0] !== lastLetter || clean.length < 2) return;

    const activePlayers = state.players.filter((p) => p.active);
    const myIndex = activePlayers.findIndex((p) => p.membershipId === fromId);
    const nextPlayer = activePlayers[(myIndex + 1) % activePlayers.length];

    const newState: WordChainState = {
      ...state,
      chain: [...state.chain, clean],
      currentPlayerId: nextPlayer.membershipId,
      scores: {
        ...state.scores,
        [fromId]: (state.scores[fromId] ?? 0) + 1,
      },
      turnStarted: Date.now(),
    };
    stateRef.current = newState;
    setGameState(newState);
    onSend({ type: "wc_state", state: newState });
  }

  function processTimeout(fromId: string) {
    const state = stateRef.current;
    if (!state || state.phase !== "playing") return;
    const updatedPlayers = state.players.map((p) =>
      p.membershipId === fromId ? { ...p, active: false } : p
    );
    const activePlayers = updatedPlayers.filter((p) => p.active);

    if (activePlayers.length <= 1) {
      const winner = activePlayers[0]?.membershipId ?? null;
      const done: WordChainState = {
        ...state,
        players: updatedPlayers,
        phase: "done",
        winner,
      };
      stateRef.current = done;
      setGameState(done);
      onSend({ type: "wc_state", state: done });
      return;
    }

    const myIndex = state.players.findIndex((p) => p.membershipId === fromId);
    let nextIndex = (myIndex + 1) % state.players.length;
    while (!updatedPlayers[nextIndex]?.active) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
    const nextPlayer = updatedPlayers[nextIndex];

    const newState: WordChainState = {
      ...state,
      players: updatedPlayers,
      currentPlayerId: nextPlayer.membershipId,
      turnStarted: Date.now(),
    };
    stateRef.current = newState;
    setGameState(newState);
    onSend({ type: "wc_state", state: newState });
  }

  function submitWord() {
    if (!gameState || gameState.currentPlayerId !== membershipId) return;
    const lastWord = gameState.chain[gameState.chain.length - 1];
    const lastLetter = lastWord.slice(-1).toUpperCase();
    const clean = input.trim().toUpperCase();
    if (!clean) return;
    if (clean[0] !== lastLetter) {
      setError(`Must start with "${lastLetter}"`);
      return;
    }
    if (clean.length < 2) {
      setError("Word too short");
      return;
    }
    setError(null);
    onSend({ type: "wc_word", from: membershipId, word: clean });
  }

  if (!gameState) {
    return (
      <Card>
        <Text style={styles.subtle}>Starting word chain…</Text>
      </Card>
    );
  }

  if (gameState.phase === "done") {
    const winnerName = gameState.winner
      ? gameState.players.find((p) => p.membershipId === gameState.winner)
          ?.displayName ?? "Someone"
      : null;
    const sorted = [...gameState.players].sort(
      (a, b) =>
        (gameState.scores[b.membershipId] ?? 0) -
        (gameState.scores[a.membershipId] ?? 0)
    );
    return (
      <Card>
        <Text style={styles.eyebrow}>Word Chain</Text>
        <Text style={styles.title}>
          {winnerName ? `${winnerName} wins!` : "Game over!"}
        </Text>
        <View style={styles.scoresBlock}>
          {sorted.map((p) => (
            <View
              key={p.membershipId}
              style={[
                styles.scoreRow,
                p.membershipId === membershipId && styles.scoreRowMine,
                !p.active && styles.scoreRowOut,
              ]}
            >
              <Text style={styles.scoreName}>
                {p.displayName}
                {!p.active ? " (out)" : ""}
              </Text>
              <Text style={styles.scoreVal}>
                {gameState.scores[p.membershipId] ?? 0} words
              </Text>
            </View>
          ))}
        </View>
        <Button label="Back to call" variant="secondary" onPress={onEnd} />
      </Card>
    );
  }

  const isMyTurn = gameState.currentPlayerId === membershipId;
  const currentPlayer = gameState.players.find(
    (p) => p.membershipId === gameState.currentPlayerId
  );
  const lastWord = gameState.chain[gameState.chain.length - 1];
  const requiredLetter = lastWord.slice(-1).toUpperCase();
  const amOut =
    gameState.players.find((p) => p.membershipId === membershipId)?.active ===
    false;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Word Chain</Text>
        <Text style={[styles.timer, timeLeft <= 5 && styles.timerUrgent]}>
          {timeLeft}s
        </Text>
      </View>

      <View style={styles.chainRow}>
        {gameState.chain.slice(-6).map((w, i) => (
          <Text
            key={`${w}-${i}`}
            style={[
              styles.chainWord,
              i === Math.min(gameState.chain.length, 6) - 1 &&
                styles.chainWordCurrent,
            ]}
          >
            {w}
          </Text>
        ))}
      </View>

      <Text style={styles.turnLabel}>
        {isMyTurn ? "Your turn!" : `${currentPlayer?.displayName ?? "…"}'s turn`}
      </Text>
      <Text style={styles.subtle}>
        Next word must start with{" "}
        <Text style={styles.requiredLetter}>{requiredLetter}</Text>
      </Text>

      {isMyTurn ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setError(null);
            }}
            onSubmitEditing={submitWord}
            placeholder={`Type a word starting with ${requiredLetter}…`}
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button label="Submit" onPress={submitWord} />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {amOut ? (
        <Text style={styles.subtle}>
          You&apos;re out this round — watch and cheer!
        </Text>
      ) : null}

      <View style={styles.miniScoreboard}>
        {gameState.players.map((p) => (
          <View
            key={p.membershipId}
            style={[
              styles.miniScore,
              p.membershipId === membershipId && styles.miniScoreMine,
              !p.active && styles.miniScoreOut,
            ]}
          >
            <Text style={styles.miniName}>
              {p.displayName.split(" ")[0]}
              {!p.active ? " ✕" : ""}
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
  timer: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timerUrgent: { color: colors.danger },
  chainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  chainWord: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  chainWordCurrent: {
    backgroundColor: colors.accent,
    color: colors.primaryText,
  },
  turnLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtle: { fontSize: fontSize.sm, color: colors.textMuted },
  requiredLetter: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  inputRow: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger },
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
  miniScoreOut: { opacity: 0.5 },
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
  scoreRowOut: { opacity: 0.5 },
  scoreName: { fontSize: fontSize.sm, color: colors.text },
  scoreVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
});
