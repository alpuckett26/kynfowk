"use client";

import { useEffect, useRef, useState } from "react";

interface WordChainState {
  phase: "playing" | "done";
  chain: string[];
  currentPlayerId: string;
  players: Array<{ membershipId: string; displayName: string; active: boolean }>;
  scores: Record<string, number>;
  turnStarted: number; // timestamp ms
  winner: string | null;
}

type WordChainAction =
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
  onEnd
}: {
  membershipId: string;
  displayName: string;
  isHost: boolean;
  players: Array<{ membershipId: string; displayName: string }>;
  onSend: (payload: WordChainAction) => void;
  onMessage: (handler: (payload: WordChainAction) => void) => () => void;
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
      winner: null
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

  // Countdown timer
  useEffect(() => {
    if (!gameState || gameState.phase !== "playing") return;
    const elapsed = Math.floor((Date.now() - gameState.turnStarted) / 1000);
    const remaining = Math.max(0, TURN_SECONDS - elapsed);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (isHost) processTimeout(gameState.currentPlayerId);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerId, gameState?.turnStarted]);

  function processWord(fromId: string, word: string) {
    const state = stateRef.current;
    if (!state || state.currentPlayerId !== fromId || state.phase !== "playing") return;
    const lastWord = state.chain[state.chain.length - 1];
    const lastLetter = lastWord.slice(-1).toUpperCase();
    const clean = word.trim().toUpperCase();
    if (!clean || clean[0] !== lastLetter || clean.length < 2) return; // invalid — ignore, let timeout handle it

    const activePlayers = state.players.filter((p) => p.active);
    const myIndex = activePlayers.findIndex((p) => p.membershipId === fromId);
    const nextPlayer = activePlayers[(myIndex + 1) % activePlayers.length];

    const newState: WordChainState = {
      ...state,
      chain: [...state.chain, clean],
      currentPlayerId: nextPlayer.membershipId,
      scores: { ...state.scores, [fromId]: (state.scores[fromId] ?? 0) + 1 },
      turnStarted: Date.now()
    };
    stateRef.current = newState;
    setGameState(newState);
    onSend({ type: "wc_state", state: newState });
  }

  function processTimeout(fromId: string) {
    const state = stateRef.current;
    if (!state || state.phase !== "playing") return;
    // Eliminate this player
    const updatedPlayers = state.players.map((p) =>
      p.membershipId === fromId ? { ...p, active: false } : p
    );
    const activePlayers = updatedPlayers.filter((p) => p.active);

    if (activePlayers.length <= 1) {
      const winner = activePlayers[0]?.membershipId ?? null;
      const done: WordChainState = { ...state, players: updatedPlayers, phase: "done", winner };
      stateRef.current = done;
      setGameState(done);
      onSend({ type: "wc_state", state: done });
      return;
    }

    const myIndex = state.players.findIndex((p) => p.membershipId === fromId);
    // Find next active player
    let nextIndex = (myIndex + 1) % state.players.length;
    while (!updatedPlayers[nextIndex]?.active) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
    const nextPlayer = updatedPlayers[nextIndex];

    const newState: WordChainState = {
      ...state,
      players: updatedPlayers,
      currentPlayerId: nextPlayer.membershipId,
      turnStarted: Date.now()
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
    if (clean.length < 2) { setError("Word too short"); return; }
    setError(null);
    onSend({ type: "wc_word", from: membershipId, word: clean });
  }

  if (!gameState) {
    return <div className="game-shell game-loading"><div className="game-spinner" /><p>Starting word chain…</p></div>;
  }

  const isMyTurn = gameState.currentPlayerId === membershipId;
  const currentPlayer = gameState.players.find((p) => p.membershipId === gameState.currentPlayerId);
  const lastWord = gameState.chain[gameState.chain.length - 1];
  const requiredLetter = lastWord.slice(-1).toUpperCase();

  return (
    <div className="game-shell">
      <div className="game-header">
        <span className="game-eyebrow">Word Chain</span>
        {gameState.phase === "playing" && (
          <span className={`game-timer${timeLeft <= 5 ? " game-timer-urgent" : ""}`}>
            {timeLeft}s
          </span>
        )}
      </div>

      {gameState.phase === "done" ? (
        <div className="game-done">
          <p className="game-done-label">
            {gameState.winner
              ? `${gameState.players.find((p) => p.membershipId === gameState.winner)?.displayName ?? "Someone"} wins!`
              : "Game over!"}
          </p>
          <div className="game-scores">
            {gameState.players
              .sort((a, b) => (gameState.scores[b.membershipId] ?? 0) - (gameState.scores[a.membershipId] ?? 0))
              .map((p) => (
                <div key={p.membershipId} className={`game-score-row${p.membershipId === membershipId ? " game-score-mine" : ""}${!p.active ? " game-score-out" : ""}`}>
                  <span>{p.displayName}{!p.active ? " (out)" : ""}</span>
                  <span className="game-score-val">{gameState.scores[p.membershipId] ?? 0} words</span>
                </div>
              ))}
          </div>
          <button className="button button-secondary" onClick={onEnd}>Back to call</button>
        </div>
      ) : (
        <>
          <div className="wc-chain">
            {gameState.chain.slice(-6).map((word, i) => (
              <span key={i} className={`wc-word${i === Math.min(gameState.chain.length, 6) - 1 ? " wc-word-current" : ""}`}>
                {word}
              </span>
            ))}
          </div>

          <div className="wc-prompt">
            <p className="wc-turn-label">
              {isMyTurn ? "Your turn!" : `${currentPlayer?.displayName ?? "…"}'s turn`}
            </p>
            <p className="wc-required">
              Next word must start with <strong className="wc-letter">{requiredLetter}</strong>
            </p>
          </div>

          {isMyTurn && (
            <div className="wc-input-row">
              <input
                className="wc-input"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && submitWord()}
                placeholder={`Type a word starting with ${requiredLetter}…`}
                autoFocus
              />
              <button className="button" onClick={submitWord}>Submit</button>
            </div>
          )}
          {error && <p className="game-error">{error}</p>}

          {!isMyTurn && gameState.players.find(p => p.membershipId === membershipId)?.active === false && (
            <p className="wc-out-msg">You&apos;re out this round — watch and cheer!</p>
          )}

          <div className="game-scoreboard">
            {gameState.players.map((p) => (
              <div key={p.membershipId} className={`game-mini-score${p.membershipId === membershipId ? " game-score-mine" : ""}${!p.active ? " game-score-out" : ""}`}>
                <span className="game-mini-name">{p.displayName.split(" ")[0]}{!p.active ? " ✕" : ""}</span>
                <span className="game-mini-pts">{gameState.scores[p.membershipId] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
