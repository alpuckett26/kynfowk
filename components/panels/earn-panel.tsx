import type { Route } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { Card } from "@/components/card";
import { GiveTimePlaceholderCard } from "@/components/give-time-placeholder-card";

interface ScoreInputRow {
  category: string;
  weight: "High" | "Medium" | "Low" | "High — v2";
  comingSoon?: boolean;
  comingSoonHref?: Route;
}

const SCORE_INPUTS: ScoreInputRow[] = [
  { category: "Contact Frequency", weight: "High" },
  { category: "Contact Depth", weight: "High" },
  { category: "Roots Contribution", weight: "Medium" },
  { category: "Growth — Recruiting", weight: "High" },
  { category: "Cross-unit Contact", weight: "Medium" },
  { category: "Consistency Bonus", weight: "Medium" },
  {
    category: "Community Roots",
    weight: "High — v2",
    comingSoon: true,
    comingSoonHref: "/dashboard" as Route,
  },
];

export interface EarnPanelProps {
  userId: string;
  connectionScore: number;
  weeklyStreak: number;
}

/**
 * M50 — Earn panel. The score-and-rewards surface. The future M44
 * monetization hooks (referral CTA, Square checkout, paid-tier upsell,
 * rewarded video) all land here without re-plumbing.
 *
 * Server component — composes the existing AdSlot + GiveTime pieces.
 */
export function EarnPanel({ userId, connectionScore, weeklyStreak }: EarnPanelProps) {
  return (
    <>
      <header className="connect-greeting">
        <h1>Earn</h1>
      </header>

      <Card>
        <div className="stack-md">
          <div className="score-headline">
            <span className="number">{connectionScore}</span>
            <span className="label">Connection Score</span>
            {weeklyStreak > 0 ? (
              <span className="meta">
                {weeklyStreak} week{weeklyStreak === 1 ? "" : "s"} in a row
              </span>
            ) : null}
          </div>
          <div className="score-grid">
            {SCORE_INPUTS.map((row) => (
              <div
                key={row.category}
                className={
                  row.comingSoon
                    ? "score-grid-item coming-soon"
                    : "score-grid-item"
                }
              >
                <span className="label">{row.category}</span>
                <span className="weight">{row.weight}</span>
                {row.comingSoon ? (
                  <span className="meta">Coming soon</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <AdSlot userId={userId} placement="earn-panel" size="rectangle" />

      <GiveTimePlaceholderCard />

      <Card>
        <div className="stack-md">
          <h2>Rewards</h2>
          <p className="meta">
            Real points, real cash, real time together. Cash-out, sponsored
            challenges, and referral payouts arrive in the next release.
          </p>
          <Link className="button button-secondary" href={"/feedback?page=%2Fdashboard%23earn" as Route}>
            Tell us what you want first
          </Link>
        </div>
      </Card>
    </>
  );
}
