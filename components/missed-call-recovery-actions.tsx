import type { Route } from "next";
import Link from "next/link";

import {
  dismissMissedCallRecoveryAction,
  rescheduleMissedCallAction
} from "@/app/actions";
import { formatDateTimeRange } from "@/lib/utils";

export function MissedCallRecoveryActions({
  callId,
  familyCircleId,
  returnPath,
  suggestedStart,
  suggestedEnd,
  showCompleteLink = true
}: {
  callId: string;
  familyCircleId: string;
  returnPath: string;
  suggestedStart: string | null;
  suggestedEnd: string | null;
  showCompleteLink?: boolean;
}) {
  return (
    <div className="stack-sm">
      {suggestedStart && suggestedEnd ? (
        <p className="meta">
          A gentle reset could put this same family group back together{" "}
          {formatDateTimeRange(suggestedStart, suggestedEnd)}.
        </p>
      ) : (
        <p className="meta">
          If this moment slipped by, you can close the loop now or put a fresh time on
          the calendar for the same group.
        </p>
      )}

      <div className="call-actions">
        {showCompleteLink ? (
          <Link className="button" href={`/calls/${callId}` as Route}>
            Mark completed
          </Link>
        ) : null}

        <form action={rescheduleMissedCallAction}>
          <input name="callId" type="hidden" value={callId} />
          <input name="familyCircleId" type="hidden" value={familyCircleId} />
          <input name="returnPath" type="hidden" value={returnPath} />
          <button className="button button-secondary" type="submit">
            Reschedule similar call
          </button>
        </form>

        <form action={dismissMissedCallRecoveryAction}>
          <input name="callId" type="hidden" value={callId} />
          <input name="familyCircleId" type="hidden" value={familyCircleId} />
          <input name="returnPath" type="hidden" value={returnPath} />
          <button className="button button-secondary" type="submit">
            Dismiss for now
          </button>
        </form>
      </div>
    </div>
  );
}
