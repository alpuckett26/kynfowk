"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Manually mark a call as completed or missed. Used on the history
 * page for past calls that were scheduled but never joined (so the
 * room-disconnect path didn't fire).
 *
 * When marking 'completed', also pre-populates call_participants
 * from the call's invited_member_ids — without participant rows the
 * score-trigger (002_connection_score_function) has nothing to
 * iterate and the call would award zero score.
 */
export async function markCallStatus(formData: FormData): Promise<void> {
  const callId = String(formData.get("call_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!callId) return;
  if (status !== "completed" && status !== "missed") return;

  const supabase = createClient();

  if (status === "completed") {
    const { data: call } = await supabase
      .from("calls")
      .select("invited_member_ids, scheduled_at")
      .eq("id", callId)
      .maybeSingle();

    const invited = (call?.invited_member_ids ?? []) as string[];
    if (invited.length > 0) {
      await supabase.from("call_participants").upsert(
        invited.map((member_id) => ({
          call_id: callId,
          member_id,
          // joined_at column has a default of now(); we want the call's
          // scheduled time to be the source of truth for scoring.
          joined_at: call?.scheduled_at ?? new Date().toISOString(),
        })),
        { onConflict: "call_id,member_id", ignoreDuplicates: true }
      );
    }

    // Set ended_at so the score function can compute a duration. If
    // duration_seconds is null, no "long_call" event fires (scoring
    // gracefully degrades — base call_completed still fires).
    await supabase
      .from("calls")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);
  } else {
    await supabase.from("calls").update({ status: "missed" }).eq("id", callId);
  }

  revalidatePath("/history");
  revalidatePath("/dashboard");
}
