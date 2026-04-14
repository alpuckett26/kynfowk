"use client";

import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/utils";
import type { CallSummaryMetrics } from "@/lib/connections";

interface PostCallSummaryProps {
  metrics: CallSummaryMetrics;
  familyName?: string;
  onDone?: () => void;
}

const eventIcons: Record<string, string> = {
  "Connection made": "📞",
  "Quality time (10+ min)": "⏱️",
  "Group connection (3+ members)": "👥",
  "Reconnection after a long time": "🎉",
  "Elder included": "🌻",
};

export function PostCallSummary({
  metrics,
  familyName,
  onDone,
}: PostCallSummaryProps) {
  const { durationMinutes, participantCount, scoreEarned, events } = metrics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-purple-500 shadow-lg mb-4">
            <span className="text-4xl">💜</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Moment Shared
            {familyName ? ` with the ${familyName}` : ""}!
          </h1>
          <p className="mt-2 text-gray-500">
            That call just added to your family story.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up">
          {[
            {
              label: "Duration",
              value: formatMinutes(durationMinutes),
              icon: "⏱️",
            },
            {
              label: "People",
              value: participantCount.toString(),
              icon: "👥",
            },
            {
              label: "Score earned",
              value: `+${scoreEarned}`,
              icon: "⭐",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center"
            >
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {s.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Connection events earned */}
        {events.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 mb-6 animate-slide-up">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              What you unlocked
            </p>
            <ul className="space-y-2">
              {events.map((evt) => (
                <li key={evt} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">
                    {eventIcons[evt] ?? "✅"}
                  </span>
                  <span className="text-sm text-gray-700">{evt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warm message */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 p-5 text-white mb-6 animate-slide-up">
          <p className="text-lg font-semibold leading-snug">
            {scoreEarned >= 5
              ? "What a call! Your family connection score just jumped."
              : scoreEarned >= 3
              ? "Every moment counts. Your streak is holding strong."
              : "Great to see your family together. Keep it up!"}
          </p>
          {scoreEarned > 0 && (
            <p className="mt-1 text-brand-100 text-sm">
              +{scoreEarned} added to your Connection Score
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={onDone}
          className={cn(
            "w-full rounded-2xl bg-gray-900 py-4 text-white font-semibold",
            "hover:bg-gray-800 active:scale-[0.98] transition-all"
          )}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
