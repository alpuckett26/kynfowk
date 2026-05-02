"use client";

import { type ReactNode, useState } from "react";

import { scheduleSuggestedCallAction } from "@/app/actions";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { MemberAvailabilityForm } from "@/components/member-availability-form";
import type { Suggestion } from "@/lib/types";
import { formatDateTimeRange } from "@/lib/utils";

export interface PlanPanelProps {
  familyCircleId: string;
  currentSlots: string[];
  suggestions: Suggestion[];
  timezone: string;
  /** Pre-rendered AICallSuggestion (server component) — passed as a slot. */
  aiSuggestion: ReactNode;
}

export function PlanPanel({
  familyCircleId,
  currentSlots,
  suggestions,
  timezone,
  aiSuggestion,
}: PlanPanelProps) {
  // Default to Overlap pane if user has set availability — they're past
  // the setup step and want to act on suggestions.
  const [pane, setPane] = useState<"availability" | "overlap">(
    currentSlots.length > 0 ? "overlap" : "availability"
  );
  const visibleSuggestions = suggestions.slice(0, 5);
  const extraSuggestions = suggestions.slice(5);
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <header className="connect-greeting">
        <h1>Plan</h1>
      </header>

      <nav className="shell-tabs" aria-label="Plan view" style={{ position: "static", transform: "none", marginInline: "auto" }}>
        <button
          type="button"
          className="shell-tab"
          aria-current={pane === "availability" ? "true" : "false"}
          onClick={() => setPane("availability")}
        >
          Your time
        </button>
        <button
          type="button"
          className="shell-tab"
          aria-current={pane === "overlap" ? "true" : "false"}
          onClick={() => setPane("overlap")}
        >
          Overlap
        </button>
      </nav>

      {pane === "availability" ? (
        <Card>
          <div className="stack-md">
            <h2>Your weekly windows</h2>
            <MemberAvailabilityForm currentSlots={currentSlots} />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="stack-md">
            <h2>Best times to connect</h2>
            {aiSuggestion}
            {visibleSuggestions.length === 0 ? (
              <EmptyState
                title="Need a little more overlap"
                description="Once two or more active members have shared availability, the strongest windows will appear here."
              />
            ) : (
              <div className="list">
                {(showMore ? suggestions : visibleSuggestions).map((suggestion) => (
                  <div className="list-item suggestion-item" key={suggestion.start_at}>
                    <div className="stack-sm">
                      <div className="suggestion-heading">
                        <p>{suggestion.label}</p>
                        <span className="badge">{suggestion.overlap_strength_label}</span>
                      </div>
                      <p className="meta">
                        {formatDateTimeRange(suggestion.start_at, suggestion.end_at, timezone)}
                      </p>
                      <p className="meta">{suggestion.rationale}</p>
                    </div>
                    <form action={scheduleSuggestedCallAction} className="suggestion-form">
                      <input name="familyCircleId" type="hidden" value={familyCircleId} />
                      <input name="scheduledStart" type="hidden" value={suggestion.start_at} />
                      <input name="scheduledEnd" type="hidden" value={suggestion.end_at} />
                      <input
                        className="suggestion-title-input"
                        defaultValue="Family Connections call"
                        name="title"
                        placeholder="Sunday family catch-up"
                      />
                      <button className="button button-primary" type="submit">
                        Schedule {suggestion.duration_minutes} min
                      </button>
                    </form>
                  </div>
                ))}
                {extraSuggestions.length > 0 && !showMore ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setShowMore(true)}
                  >
                    Show {extraSuggestions.length} more
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      )}

      <details>
        <summary>How this works</summary>
        <p className="meta">
          Each member shares the times they&apos;re generally free. Kynfowk finds
          the strongest overlap windows in the next seven days and lets you
          schedule a call from any of them in one tap.
        </p>
      </details>
    </>
  );
}
