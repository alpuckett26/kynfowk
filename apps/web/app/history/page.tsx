import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { getCallHistory, getCurrentFamily } from "@/lib/connections";
import { formatMinutes } from "@/lib/utils";
import { markCallStatus } from "./actions";

export const metadata: Metadata = {
  title: "Call History",
  description: "Every call your family has shared, newest first.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_BADGE: Record<
  "completed" | "missed" | "in_progress" | "scheduled",
  { label: string; className: string }
> = {
  completed: {
    label: "Completed",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  missed: {
    label: "Missed",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  in_progress: {
    label: "In progress",
    className: "border-brand-200 bg-brand-50 text-brand-700",
  },
  scheduled: {
    label: "Scheduled",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  },
};

export default async function HistoryPage() {
  const [family, calls] = await Promise.all([
    getCurrentFamily(),
    getCallHistory(),
  ]);

  return (
    <>
      <TopNav width="narrow">
        <Link
          href="/dashboard"
          className="text-gray-500 transition-colors hover:text-gray-800"
        >
          ← Dashboard
        </Link>
      </TopNav>

      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call history</h1>
            <p className="mt-1 text-sm text-gray-500">
              Every call your {family.name} family has shared.
            </p>
          </div>

          {calls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
              <p className="text-3xl">📞</p>
              <p className="mt-3 text-sm font-medium text-gray-700">
                No past calls yet
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Once you complete your first call, it&apos;ll show up here.
              </p>
              <Link
                href="/schedule"
                className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Schedule a call
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white shadow-sm">
              {calls.map((c) => {
                const when = new Date(c.scheduledAt);
                const isOrphan = c.status === "scheduled";
                const badge = isOrphan
                  ? {
                      label: "Pending",
                      className:
                        "border-amber-200 bg-amber-50 text-amber-700",
                    }
                  : STATUS_BADGE[c.status];
                return (
                  <li
                    key={c.id + c.scheduledAt}
                    className="flex items-center justify-between gap-3 px-5 py-4"
                  >
                    <Link
                      href={`/post-call/${c.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 hover:text-brand-700">
                          {c.title}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {dateFmt.format(when)} at {timeFmt.format(when)}
                        {c.durationMinutes != null && (
                          <> · {formatMinutes(c.durationMinutes)}</>
                        )}
                        {c.participantCount > 0 && (
                          <>
                            {" · "}
                            {c.participantCount}{" "}
                            {c.participantCount === 1 ? "member" : "members"}
                          </>
                        )}
                      </p>
                    </Link>
                    {isOrphan ? (
                      <div className="flex items-center gap-1.5">
                        <form action={markCallStatus}>
                          <input type="hidden" name="call_id" value={c.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="completed"
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-700 transition-colors hover:bg-green-100"
                          >
                            ✓ Done
                          </button>
                        </form>
                        <form action={markCallStatus}>
                          <input type="hidden" name="call_id" value={c.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="missed"
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            Missed
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">→</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
