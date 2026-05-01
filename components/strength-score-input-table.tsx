import type { Route } from "next";
import Link from "next/link";

/**
 * M44 — Strength Score input table.
 *
 * Surfaces the seven score-input categories that drive the Connection /
 * Strength Score. v1 ships the table read-only — the actual numeric
 * formula evolution (per-row weights + Community Roots scoring) lands
 * in v2 once Give Time partner integration is live.
 *
 * Community Roots is rendered with a "Coming soon — v2" pill and links
 * to the Give Time placeholder screen; this is the "Add Community
 * Roots row to Strength Score input table in data model" v1 item.
 */

interface ScoreInput {
  category: string;
  measures: string;
  examples: string;
  weight: "High" | "Medium" | "Low" | "High — v2";
  comingSoon?: boolean;
  comingSoonLinkHref?: Route;
}

const SCORE_INPUTS: ScoreInput[] = [
  {
    category: "Contact Frequency",
    measures: "How often members connect with family",
    examples: "Calls, messages, check-ins",
    weight: "High",
  },
  {
    category: "Contact Depth",
    measures: "Quality and intentionality of connection",
    examples: "Events, group calls, visits",
    weight: "High",
  },
  {
    category: "Roots Contribution",
    measures: "Investment in family memory and legacy",
    examples: "Stories, photos, oral history",
    weight: "Medium",
  },
  {
    category: "Growth — Recruiting",
    measures: "Expanding the family network",
    examples: "Invite links, new signups converted",
    weight: "High",
  },
  {
    category: "Cross-unit Contact",
    measures: "Reaching beyond the nuclear unit",
    examples: "Check-ins with other units",
    weight: "Medium",
  },
  {
    category: "Consistency Bonus",
    measures: "Sustained activity over time",
    examples: "Streak multiplier, no time gaps",
    weight: "Medium",
  },
  {
    category: "Community Roots",
    measures: "Acts of connection outside the family tree",
    examples: "Nursing home calls via Give Time",
    weight: "High — v2",
    comingSoon: true,
    comingSoonLinkHref: "/family" as Route,
  },
];

export function StrengthScoreInputTable() {
  return (
    <div className="strength-score-input-table">
      <div className="strength-score-header">
        <h3>Strength Score inputs</h3>
        <p className="meta">
          What we measure when we score how connected your family is.
        </p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Measures</th>
            <th>Examples</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {SCORE_INPUTS.map((input) => (
            <tr
              key={input.category}
              className={input.comingSoon ? "score-input-coming-soon" : undefined}
            >
              <td>
                <strong>{input.category}</strong>
                {input.comingSoon ? (
                  <>
                    {" "}
                    <span className="badge score-input-soon-badge">Coming soon</span>
                  </>
                ) : null}
              </td>
              <td>{input.measures}</td>
              <td>
                {input.comingSoon && input.comingSoonLinkHref ? (
                  <Link href={input.comingSoonLinkHref}>{input.examples}</Link>
                ) : (
                  input.examples
                )}
              </td>
              <td>{input.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
