"use client";

import { StatTile } from "@/components/ui/StatTile";
import { formatMinutes, formatNumber, pluralize } from "@/lib/utils";
import type { ConnectionMetrics } from "@/lib/types";

interface ConnectionsCounterProps {
  metrics: ConnectionMetrics;
  familyName?: string;
  loading?: boolean;
}

function StreakBadge({ weeks }: { weeks: number }) {
  if (weeks === 0) return null;
  const flame = weeks >= 8 ? "🔥" : weeks >= 4 ? "✨" : "⭐";
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-warm-50 border border-warm-200 px-3 py-1 text-sm font-medium text-warm-800">
      <span>{flame}</span>
      <span>
        {weeks}-{pluralize(weeks, "week")} Reconnection Streak
      </span>
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  // Visual score band: 0–10 low, 11–25 good, 26–50 great, 50+ exceptional
  const maxDisplay = 60;
  const pct = Math.min((score / maxDisplay) * 100, 100);
  const color =
    score >= 40
      ? "bg-gradient-to-r from-green-400 to-emerald-500"
      : score >= 20
      ? "bg-gradient-to-r from-brand-400 to-purple-500"
      : "bg-gradient-to-r from-warm-400 to-orange-400";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Family Connection Score
          </p>
          <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
            {score}
          </p>
        </div>
        <span className="text-3xl">💜</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {score < 10
          ? "Your family journey starts here"
          : score < 25
          ? "Building meaningful connections"
          : score < 45
          ? "Beautifully connected family"
          : "Exceptional — keep going!"}
      </p>
    </div>
  );
}

export function ConnectionsCounter({
  metrics,
  familyName,
  loading = false,
}: ConnectionsCounterProps) {
  const {
    completedCalls,
    totalMinutes,
    uniqueMembersThisWeek,
    streakWeeks,
    connectionScore,
    firstReconnections,
  } = metrics;

  return (
    <section aria-label="Family Connections" className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {familyName ? `${familyName}'s Connections` : "Family Connections"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Your{" "}
            <span className="font-medium text-gray-700">
              moments shared this week
            </span>
          </p>
        </div>
        <StreakBadge weeks={streakWeeks} />
      </div>

      {/* Score meter */}
      <ScoreMeter score={connectionScore} />

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Moments Shared"
          value={formatNumber(completedCalls)}
          subtext={`${pluralize(completedCalls, "call")} completed`}
          icon="📞"
          accent="bg-brand-50"
          loading={loading}
        />
        <StatTile
          label="Time Together"
          value={formatMinutes(totalMinutes)}
          subtext="quality family time"
          icon="⏱️"
          accent="bg-warm-50"
          loading={loading}
        />
        <StatTile
          label="People Connected"
          value={uniqueMembersThisWeek}
          subtext="unique this week"
          icon="👥"
          accent="bg-green-50"
          loading={loading}
        />
        <StatTile
          label="Streak"
          value={streakWeeks === 0 ? "—" : `${streakWeeks}w`}
          subtext={streakWeeks > 0 ? "consecutive weeks" : "Start your streak!"}
          icon="🔥"
          accent="bg-orange-50"
          loading={loading}
        />
      </div>

      {/* Bonus metrics */}
      {(firstReconnections > 0 || metrics.elderCalls > 0) && (
        <div className="flex flex-wrap gap-3">
          {firstReconnections > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5">
              <span className="text-lg">🎉</span>
              <div>
                <p className="text-sm font-semibold text-purple-900">
                  {firstReconnections} reconnection
                  {firstReconnections > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-purple-600">
                  first call in 30+ days
                </p>
              </div>
            </div>
          )}
          {metrics.elderCalls > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
              <span className="text-lg">🌻</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Elder included
                </p>
                <p className="text-xs text-amber-600">
                  {metrics.elderCalls} {pluralize(metrics.elderCalls, "time")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && completedCalls === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-3xl mb-2">👋</p>
          <p className="font-semibold text-gray-700">
            Your first call is waiting
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Schedule a call and your family connection journey begins here.
          </p>
        </div>
      )}
    </section>
  );
}
