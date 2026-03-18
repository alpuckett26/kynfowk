import type { FamilyPollResult } from "@/lib/data";

function PollBar({ result }: { result: FamilyPollResult }) {
  const total = result.count_a + result.count_b;
  const pctA = total ? Math.round((result.count_a / total) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="poll-bar-card">
      <p className="poll-bar-question">{result.question}</p>

      <div className="poll-bar-track">
        <div
          className="poll-bar-seg poll-bar-a"
          style={{ width: `${pctA}%` }}
          title={`${result.option_a}: ${result.count_a}`}
        >
          {pctA >= 20 && (
            <span className="poll-bar-label">
              {result.emoji_a} {result.option_a}
            </span>
          )}
        </div>
        <div
          className="poll-bar-seg poll-bar-b"
          style={{ width: `${pctB}%` }}
          title={`${result.option_b}: ${result.count_b}`}
        >
          {pctB >= 20 && (
            <span className="poll-bar-label">
              {result.emoji_b} {result.option_b}
            </span>
          )}
        </div>
      </div>

      <div className="poll-bar-footer">
        <span className="poll-bar-stat poll-bar-stat-a">
          {result.emoji_a} {result.option_a} · {result.count_a}
          {result.viewer_choice === "a" && (
            <span className="poll-bar-you"> (you)</span>
          )}
        </span>
        <span className="poll-bar-stat poll-bar-stat-b">
          {result.count_b} · {result.option_b} {result.emoji_b}
          {result.viewer_choice === "b" && (
            <span className="poll-bar-you"> (you)</span>
          )}
        </span>
      </div>

      {/* Who chose what */}
      <div className="poll-bar-who">
        {result.responses.map((r) => (
          <span
            key={r.displayName}
            className={`poll-bar-who-chip poll-bar-who-${r.choice}`}
          >
            {r.choice === "a" ? result.emoji_a : result.emoji_b}{" "}
            {r.displayName.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FamilyPollChart({ results }: { results: FamilyPollResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="poll-chart-shell">
      <div className="poll-chart-header">
        <h2>Family Favorites</h2>
        <p className="meta">
          See where your circle stands on the things that matter — and the things that really don&apos;t.
        </p>
      </div>
      <div className="poll-chart-list">
        {results.map((r) => (
          <PollBar key={r.id} result={r} />
        ))}
      </div>
    </div>
  );
}
