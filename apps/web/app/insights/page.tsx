import type { Metadata } from "next";
import Link from "next/link";
import { getAllTimeStats, getCurrentFamily } from "@/lib/connections";
import { StatTile } from "@/components/ui/StatTile";
import { formatMinutes, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Family Insights",
  description: "Your all-time family connection stats and milestones.",
};

const milestones = [
  { threshold: 10, label: "10 calls completed", icon: "📞" },
  { threshold: 100, label: "100 minutes of family time", icon: "⏱️", isMinutes: true },
  { threshold: 50, label: "Connection score 50+", icon: "⭐", isScore: true },
  { threshold: 4, label: "4-week streak", icon: "🔥", isStreak: true },
  { threshold: 25, label: "25 calls completed", icon: "🎯" },
];

export default async function InsightsPage() {
  const [family, stats] = await Promise.all([
    getCurrentFamily(),
    getAllTimeStats(),
  ]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">Family Insights</span>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-10">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Insights</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your {family.name} family connection legacy, all time
            </p>
          </div>

          {/* All-time stats */}
          <section aria-labelledby="alltime-stats-heading">
            <h2 id="alltime-stats-heading" className="text-base font-semibold text-gray-700 mb-4">
              All-time highlights
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile
                label="Total Calls"
                value={formatNumber(stats.totalCalls)}
                subtext="moments shared"
                icon="📞"
                accent="bg-brand-50"
              />
              <StatTile
                label="Time Together"
                value={formatMinutes(stats.totalMinutes)}
                subtext="family time"
                icon="⏱️"
                accent="bg-warm-50"
              />
              <StatTile
                label="Connection Score"
                value={stats.totalScore}
                subtext="lifetime"
                icon="⭐"
                accent="bg-yellow-50"
              />
              <StatTile
                label="Best Week"
                value={stats.bestWeekScore}
                subtext="highest score"
                icon="🏆"
                accent="bg-orange-50"
              />
              <StatTile
                label="Longest Streak"
                value={`${stats.longestStreak}w`}
                subtext="consecutive weeks"
                icon="🔥"
                accent="bg-red-50"
              />
            </div>
          </section>

          {/* Milestone tracker */}
          <section aria-labelledby="milestones-heading">
            <h2 id="milestones-heading" className="text-base font-semibold text-gray-700 mb-4">
              Milestones
            </h2>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
              {milestones.map((m) => {
                const current = m.isMinutes
                  ? stats.totalMinutes
                  : m.isScore
                  ? stats.totalScore
                  : m.isStreak
                  ? stats.longestStreak
                  : stats.totalCalls;
                const achieved = current >= m.threshold;
                return (
                  <div
                    key={m.label}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{m.icon}</span>
                      <span
                        className={`text-sm font-medium ${
                          achieved ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {m.label}
                      </span>
                    </div>
                    {achieved ? (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                        Achieved ✓
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {current} / {m.threshold}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Encouragement */}
          <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 p-6 text-white text-center">
            <p className="text-2xl font-bold mb-2">
              Your family made {stats.totalCalls} connections
            </p>
            <p className="text-brand-100">
              That&apos;s {stats.totalCalls} times you showed up for each other.
              Keep going.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
