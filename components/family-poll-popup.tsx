"use client";

import { useActionState, useEffect, useState } from "react";

import { savePollResponseAction } from "@/app/actions";
import type { FamilyPoll } from "@/lib/data";

export function FamilyPollPopup({ poll }: { poll: FamilyPoll }) {
  const [visible, setVisible] = useState(false);
  const [chosen, setChosen] = useState<"a" | "b" | null>(null);
  const [state, action, pending] = useActionState(savePollResponseAction, {
    status: "idle" as const
  });

  // Delay pop-in so it doesn't flash on page load
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after a successful answer
  useEffect(() => {
    if (state.status === "success") {
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.status]);

  if (!visible) return null;

  const answered = state.status === "success";

  return (
    <div className="poll-popup-backdrop" onClick={() => setVisible(false)}>
      <div
        className={`poll-popup${answered ? " poll-popup-answered" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Family poll"
      >
        <button
          className="poll-popup-close"
          aria-label="Dismiss"
          onClick={() => setVisible(false)}
        >
          ✕
        </button>

        <p className="poll-popup-eyebrow">Family Poll</p>
        <p className="poll-popup-question">{poll.question}</p>

        {answered ? (
          <div className="poll-popup-thanks">
            <span className="poll-popup-thanks-icon">
              {chosen === "a" ? poll.emoji_a ?? "✅" : poll.emoji_b ?? "✅"}
            </span>
            <p>Got it! Your answer is in.</p>
          </div>
        ) : (
          <form action={action} className="poll-popup-choices">
            <input type="hidden" name="pollId" value={poll.id} />
            <button
              className="poll-choice-btn"
              name="choice"
              value="a"
              type="submit"
              disabled={pending}
              onClick={() => setChosen("a")}
            >
              <span className="poll-choice-emoji">{poll.emoji_a ?? "🅰️"}</span>
              <span className="poll-choice-label">{poll.option_a}</span>
            </button>
            <span className="poll-vs">or</span>
            <button
              className="poll-choice-btn"
              name="choice"
              value="b"
              type="submit"
              disabled={pending}
              onClick={() => setChosen("b")}
            >
              <span className="poll-choice-emoji">{poll.emoji_b ?? "🅱️"}</span>
              <span className="poll-choice-label">{poll.option_b}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
