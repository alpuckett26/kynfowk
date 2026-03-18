import { scheduleSuggestedCallAction } from "@/app/actions";
import { getAICallSuggestion, getAISuggestionInput } from "@/lib/ai-suggestions";
import type { Suggestion } from "@/lib/types";
import { formatDateTimeRange } from "@/lib/utils";

// Find the suggestion whose participant set best overlaps the AI-recommended IDs
function bestMatchingSuggestion(
  suggestions: Suggestion[],
  recommendedIds: string[]
): Suggestion | null {
  if (!suggestions.length || !recommendedIds.length) return suggestions[0] ?? null;

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
  const input = await getAISuggestionInput(userId);
  if (!input) return null;

  const ai = await getAICallSuggestion(input);
  if (!ai || !ai.reason) return null;

  const match = bestMatchingSuggestion(suggestions, ai.participantIds);
  const suggestedNames = ai.participantIds
    .map((id) => input.members.find((m) => m.id === id)?.display_name)
    .filter(Boolean);

  return (
    <div className="ai-suggestion-card">
      <div className="ai-suggestion-header">
        <span className="ai-badge">✦ AI Suggested</span>
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
          No shared availability yet — ask your family members to update their windows so a time
          can be found.
        </p>
      )}
    </div>
  );
}
