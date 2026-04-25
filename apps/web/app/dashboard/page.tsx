import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionsCounter } from "@/components/ConnectionsCounter";
import { TopNav } from "@/components/TopNav";
import {
  getFamilyMetrics,
  getAllTimeStats,
  getCurrentFamily,
  getUpcomingCalls,
  type UpcomingCall,
} from "@/lib/connections";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { formatMinutes, formatNumber } from "@/lib/utils";

async function getFamilyMemberCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

function WelcomeBanner({ familyName }: { familyName: string }) {
  return (
    <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-warm-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          💜
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            Welcome to the {familyName} family
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Two quick steps and you&apos;re ready: invite a family member, then
            schedule your first call together.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/family"
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              👥 Invite family
            </Link>
            <Link
              href="/schedule"
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              📅 Schedule a call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your family's connection score, upcoming calls, and weekly stats — all in one place.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function UpcomingCalls({ calls }: { calls: UpcomingCall[] }) {
  return (
    <section aria-labelledby="upcoming-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          id="upcoming-heading"
          className="text-base font-semibold text-gray-900"
        >
          Upcoming calls
        </h3>
        <Link
          href="/schedule"
          className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          + Schedule
        </Link>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">No upcoming calls yet.</p>
          <Link
            href="/schedule"
            className="mt-3 inline-block rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700"
          >
            Schedule one
          </Link>
        </div>
      ) : (
        calls.map((c) => {
          const when = new Date(c.scheduledAt);
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg">
                  📅
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dateFmt.format(when)} at {timeFmt.format(when)}
                    {c.participantCount > 0 && (
                      <>
                        {" · "}
                        {c.participantCount}{" "}
                        {c.participantCount === 1 ? "member" : "members"}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Link
                href={`/call/${c.id}`}
                className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                Join →
              </Link>
            </div>
          );
        })
      )}
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
  const [family, weekly, allTime, upcoming] = await Promise.all([
    getCurrentFamily(),
    getFamilyMetrics(),
    getAllTimeStats(),
    getUpcomingCalls(),
  ]);

  // Show welcome banner only for fresh signed-in users — solo family,
  // no calls yet. Skipped in demo mode (the demo data is rich already).
  const memberCount = family.signedIn ? await getFamilyMemberCount() : 0;
  const showWelcome =
    family.signedIn && memberCount <= 1 && upcoming.length === 0;

  return (
    <>
      <TopNav width="narrow">
        <Link
          href="/case-studies"
          className="hidden text-gray-500 transition-colors hover:text-gray-800 sm:block"
        >
          Family Stories
        </Link>
        {family.signedIn ? (
          <>
            <Link
              href="/profile"
              className="hidden text-gray-500 transition-colors hover:text-gray-800 sm:block"
            >
              Profile
            </Link>
            <SignOutLink />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Demo mode
            </div>
            <Link
              href="/login"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Sign in
            </Link>
          </>
        )}
      </TopNav>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
          {showWelcome && <WelcomeBanner familyName={family.name} />}

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {family.name} Family
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
                familyName={family.name}
              />
              <UpcomingCalls calls={upcoming} />
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
                  href="/schedule"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all shadow-sm"
                >
                  <span className="text-base">📅</span>
                  Schedule a call
                </Link>
                <Link
                  href="/family"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all shadow-sm"
                >
                  <span className="text-base">👥</span>
                  Manage family
                </Link>
                <Link
                  href="/history"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all shadow-sm"
                >
                  <span className="text-base">🕒</span>
                  Call history
                </Link>
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

function SignOutLink() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-gray-500 transition-colors hover:text-gray-800"
      >
        Sign out
      </button>
    </form>
  );
}
