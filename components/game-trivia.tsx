"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TriviaQuestion {
  question: string;
  correct: string;
  choices: string[]; // shuffled
}

interface TriviaState {
  phase: "waiting" | "question" | "reveal" | "done";
  questionIndex: number;
  questions: TriviaQuestion[];
  buzzerId: string | null; // who buzzed first
  scores: Record<string, number>;
  players: Array<{ membershipId: string; displayName: string }>;
}

type TriviaAction =
  | { type: "trivia_state"; state: TriviaState }
  | { type: "trivia_buzz"; from: string }
  | { type: "trivia_next" };

function decodeHtml(html: string) {
  if (typeof document === "undefined") return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GameTrivia({
  membershipId,
  displayName,
  isHost,
  players,
  onSend,
  onMessage,
  onEnd,
  sessionStartTime
}: {
  membershipId: string;
  displayName: string;
  isHost: boolean;
  players: Array<{ membershipId: string; displayName: string }>;
  onSend: (payload: TriviaAction) => void;
  onMessage: (handler: (payload: TriviaAction) => void) => () => void;
  onEnd: () => void;
  sessionStartTime: number;
}) {
  const [gameState, setGameState] = useState<TriviaState | null>(null);
  const [myBuzzed, setMyBuzzed] = useState(false);
  const [loading, setLoading] = useState(isHost);
  const [revealTimer, setRevealTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Host: fetch questions and init state
  useEffect(() => {
    if (!isHost) return;
    async function fetchQuestions() {
      try {
        const res = await fetch(
          "https://opentdb.com/api.php?amount=10&type=multiple&difficulty=easy"
        );
        const data = await res.json();
        const questions: TriviaQuestion[] = (data.results ?? []).map(
          (q: { question: string; correct_answer: string; incorrect_answers: string[] }) => {
            const choices = shuffle([
              decodeHtml(q.correct_answer),
              ...q.incorrect_answers.map(decodeHtml)
            ]);
            return {
              question: decodeHtml(q.question),
              correct: decodeHtml(q.correct_answer),
              choices
            };
          }
        );
        const initial: TriviaState = {
          phase: "question",
          questionIndex: 0,
          questions,
          buzzerId: null,
          scores: Object.fromEntries(players.map((p) => [p.membershipId, 0])),
          players
        };
        setGameState(initial);
        setLoading(false);
        onSend({ type: "trivia_state", state: initial });
      } catch {
        setLoading(false);
      }
    }
    fetchQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Subscribe to incoming messages
  useEffect(() => {
    const unsub = onMessage((payload) => {
      if (payload.type === "trivia_state") {
        setGameState(payload.state);
        setMyBuzzed(false);
        setLoading(false);
      } else if (payload.type === "trivia_buzz" && isHost && gameState?.phase === "question" && !gameState.buzzerId) {
        // Host processes first buzz
        const newState: TriviaState = { ...gameState, buzzerId: payload.from, phase: "reveal" };
        // Give point if first correct buzzer (in this simple model, buzzer wins a point)
        newState.scores = {
          ...newState.scores,
          [payload.from]: (newState.scores[payload.from] ?? 0) + 1
        };
        setGameState(newState);
        onSend({ type: "trivia_state", state: newState });
      }
    });
    return unsub;
  }, [onMessage, isHost, gameState, onSend]);

  // Reveal timer: auto-advance after 4 seconds
  useEffect(() => {
    if (gameState?.phase !== "reveal" || !isHost) return;
    setRevealTimer(4);
    timerRef.current = setInterval(() => {
      setRevealTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advanceQuestion();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, gameState?.questionIndex]);

  const advanceQuestion = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.questionIndex + 1;
      if (nextIndex >= prev.questions.length) {
        const done: TriviaState = { ...prev, phase: "done" };
        onSend({ type: "trivia_state", state: done });
        return done;
      }
      const next: TriviaState = { ...prev, phase: "question", questionIndex: nextIndex, buzzerId: null };
      onSend({ type: "trivia_state", state: next });
      return next;
    });
  }, [onSend]);

  function buzz() {
    if (myBuzzed || gameState?.phase !== "question" || gameState.buzzerId) return;
    setMyBuzzed(true);
    onSend({ type: "trivia_buzz", from: membershipId });
  }

  if (loading) {
    return (
      <div className="game-shell game-loading">
        <div className="game-spinner" />
        <p>Loading trivia questions…</p>
      </div>
    );
  }

  if (!gameState) return null;

  const q = gameState.questions[gameState.questionIndex];
  const buzzerName = gameState.buzzerId
    ? (gameState.players.find((p) => p.membershipId === gameState.buzzerId)?.displayName ?? "Someone")
    : null;

  return (
    <div className="game-shell">
      <div className="game-header">
        <span className="game-eyebrow">Family Trivia</span>
        <span className="game-progress">
          Question {gameState.questionIndex + 1} / {gameState.questions.length}
        </span>
      </div>

      {gameState.phase === "done" ? (
        <div className="game-done">
          <p className="game-done-label">Game over!</p>
          <div className="game-scores">
            {gameState.players
              .sort((a, b) => (gameState.scores[b.membershipId] ?? 0) - (gameState.scores[a.membershipId] ?? 0))
              .map((p) => (
                <div key={p.membershipId} className={`game-score-row${p.membershipId === membershipId ? " game-score-mine" : ""}`}>
                  <span>{p.displayName}</span>
                  <span className="game-score-val">{gameState.scores[p.membershipId] ?? 0} pts</span>
                </div>
              ))}
          </div>
          <button className="button button-secondary" onClick={onEnd}>Back to call</button>
        </div>
      ) : (
        <>
          <div className="game-question-card">
            <p className="game-question-text">{q?.question}</p>
          </div>

          {gameState.phase === "question" && (
            <div className="game-buzz-zone">
              <button
                className={`game-buzz-btn${myBuzzed ? " game-buzz-btn-pressed" : ""}`}
                onClick={buzz}
                disabled={myBuzzed || !!gameState.buzzerId}
              >
                {myBuzzed ? "Buzzed in!" : "Buzz in!"}
              </button>
              <p className="game-buzz-hint">Say your answer out loud when you buzz in</p>
            </div>
          )}

          {gameState.phase === "reveal" && (
            <div className="game-reveal">
              {buzzerName && (
                <p className="game-buzzer-name">
                  <strong>{buzzerName}</strong> buzzed in!
                </p>
              )}
              <p className="game-correct-answer">
                Answer: <strong>{q?.correct}</strong>
              </p>
              {isHost && (
                <p className="game-reveal-timer">Next question in {revealTimer}s…</p>
              )}
            </div>
          )}

          <div className="game-scoreboard">
            {gameState.players.map((p) => (
              <div key={p.membershipId} className={`game-mini-score${p.membershipId === membershipId ? " game-score-mine" : ""}`}>
                <span className="game-mini-name">{p.displayName.split(" ")[0]}</span>
                <span className="game-mini-pts">{gameState.scores[p.membershipId] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
