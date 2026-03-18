import { scheduleSuggestedCallAction } from "@/app/actions";
import { getAICallSuggestion, getAISuggestionInput } from "@/lib/ai-suggestions";
import type { Suggestion } from "@/lib/types";
import { formatDateTimeRange } from "@/lib/utils";

function bestMatchingSuggestion(
  suggestions: Suggestion[],
  recommendedIds: string[]
): Suggestion | null {
  if (!suggestions.length) return null;
  if (!recommendedIds.length) return suggestions[0];

  const recommended = new Set(recommendedIds);
  let best: Suggestion | null = null;
  let bestScore = -1;

  for (const s of suggestions) {
    const overlap = s.participant_ids.filter((id) => recommended.has(id)).length;
    const score = overlap / Math.max(s.participant_ids.length, recommended.size);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export async function AICallSuggestion({
  userId,
  familyCircleId,
  suggestions,
  timezone
}: {
  userId: string;
  familyCircleId: string;
  suggestions: Suggestion[];
  timezone: string;
}) {
  let input;
  try {
    input = await getAISuggestionInput(userId);
  } catch (err) {
    console.error("[AICallSuggestion] getAISuggestionInput threw:", err);
    input = null;
  }

  // No circle or no members at all — don't render
  if (!input) return null;

  const activeOthers = input.members.filter(
    (m) => m.status === "active" && m.id !== input.viewerMembershipId
  );

  // Only the viewer is active — prompt them to invite family
  if (activeOthers.length === 0) {
    return (
      <div className="ai-suggestion-card">
        <div className="ai-suggestion-header">
          <span className="ai-badge">✦ AI Suggested</span>
          <h3 className="ai-suggestion-focus">Invite family to unlock suggestions</h3>
        </div>
        <p className="ai-suggestion-reason">
          Once at least one family member joins your circle and sets their availability, the AI
          will start recommending who to call and when — based on relationship closeness and how
          long it&apos;s been since you last connected.
        </p>
      </div>
    );
  }

  let ai;
  try {
    ai = await getAICallSuggestion(input);
  } catch (err) {
    console.error("[AICallSuggestion] getAICallSuggestion threw:", err);
    ai = null;
  }

  if (!ai) return null;

  const match = bestMatchingSuggestion(suggestions, ai.participantIds);
  const suggestedNames = ai.participantIds
    .map((id) => input.members.find((m) => m.id === id)?.display_name)
    .filter(Boolean) as string[];

  return (
    <div className="ai-suggestion-card">
      <div className="ai-suggestion-header">
        <span className={`ai-badge ${ai.isAI ? "" : "ai-badge-data"}`}>
          {ai.isAI ? "✦ AI Suggested" : "✦ Suggested"}
        </span>
        <h3 className="ai-suggestion-focus">{ai.focus}</h3>
      </div>

      <p className="ai-suggestion-reason">{ai.reason}</p>

      {suggestedNames.length > 0 && (
        <p className="ai-suggestion-who">
          <strong>Suggested for this call:</strong> {suggestedNames.join(", ")}
        </p>
      )}

      {match ? (
        <div className="ai-suggestion-schedule">
          <p className="meta">{formatDateTimeRange(match.start_at, match.end_at, timezone)}</p>
          <form action={scheduleSuggestedCallAction} className="suggestion-form">
            <input name="familyCircleId" type="hidden" value={familyCircleId} />
            <input name="scheduledStart" type="hidden" value={match.start_at} />
            <input name="scheduledEnd" type="hidden" value={match.end_at} />
            <input
              className="suggestion-title-input"
              defaultValue={ai.focus}
              name="title"
              placeholder="Call title"
            />
            <button className="button" type="submit">
              Schedule {match.duration_minutes} min →
            </button>
          </form>
        </div>
      ) : (
        <p className="meta ai-suggestion-no-slot">
          No shared availability window yet — have your family members set their free hours so a
          time can be matched.
        </p>
      )}
    </div>
  );
}
