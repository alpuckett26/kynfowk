import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { TopNav } from "@/components/TopNav";
import { getFamilyMetrics, getAllTimeStats } from "@/lib/connections";
import { formatMinutes, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your family's connection score, upcoming calls, and weekly stats — all in one place.",
};

// Demo family ID — in production this comes from auth session
const DEMO_FAMILY_ID = "11111111-0000-0000-0000-000000000001";
const DEMO_FAMILY_NAME = "Henderson";

function UpcomingCalls() {
  const calls = [
    { name: "Sunday catch-up", date: "Sun, Mar 16", time: "6:00 PM", who: "All 4 members" },
    { name: "Check-in with Gran", date: "Wed, Mar 19", time: "11:00 AM", who: "Margaret + David" },
  ];

  return (
    <section aria-labelledby="upcoming-heading" className="space-y-3">
      <h3 id="upcoming-heading" className="text-base font-semibold text-gray-900">
        Upcoming calls
      </h3>
      {calls.map((c) => (
        <div
          key={c.name}
          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
              📅
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{c.name}</p>
              <p className="text-xs text-gray-500">
                {c.date} at {c.time} · {c.who}
              </p>
            </div>
          </div>
          <Link
            href={`/post-call/demo-call-id`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 rounded-lg px-3 py-1.5 transition-colors"
          >
            Join →
          </Link>
        </div>
      ))}
    </section>
  );
}

function AllTimePanel({
  data,
}: {
  data: {
    totalCalls: number;
    totalMinutes: number;
    totalScore: number;
    bestWeekScore: number;
    longestStreak: number;
  };
}) {
  return (
    <section aria-labelledby="alltime-heading" className="space-y-3">
      <h3
        id="alltime-heading"
        className="text-base font-semibold text-gray-900"
      >
        All-time family highlights
      </h3>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        {[
          {
            icon: "📞",
            label: "Total calls made",
            value: formatNumber(data.totalCalls),
          },
          {
            icon: "⏱️",
            label: "Total time together",
            value: formatMinutes(data.totalMinutes),
          },
          {
            icon: "⭐",
            label: "Lifetime connection score",
            value: data.totalScore.toString(),
          },
          {
            icon: "🏆",
            label: "Best week score",
            value: data.bestWeekScore.toString(),
          },
          {
            icon: "🔥",
            label: "Longest streak",
            value: `${data.longestStreak} weeks`,
          },
        ].map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-5 py-3.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{r.icon}</span>
              <span className="text-sm text-gray-600">{r.label}</span>
            </div>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const [weekly, allTime] = await Promise.all([
    getFamilyMetrics(DEMO_FAMILY_ID),
    getAllTimeStats(DEMO_FAMILY_ID),
  ]);

  return (
    <>
      <TopNav width="narrow">
        <Link
          href="/case-studies"
          className="hidden text-gray-500 transition-colors hover:text-gray-800 sm:block"
        >
          Family Stories
        </Link>
        <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Demo mode
        </div>
      </TopNav>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {DEMO_FAMILY_NAME} Family
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Link
              href="/insights"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
            >
              <span>📊</span>
              Insights
            </Link>
          </div>

          {/* Main content */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: connections counter (takes 2 cols) */}
            <div className="lg:col-span-2 space-y-8">
              <ConnectionsCounter
                metrics={weekly}
                familyName={DEMO_FAMILY_NAME}
              />
              <UpcomingCalls />
            </div>

            {/* Right: all-time stats */}
            <div className="space-y-6">
              <AllTimePanel data={allTime} />

              {/* Quick actions */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Quick actions
                </h3>
                <Link
                  href="/case-studies"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all shadow-sm"
                >
                  <span className="text-base">💜</span>
                  View family stories
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
