"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Mark a call as completed when the participant leaves the LiveKit room.
 * Computes duration from the started_at timestamp set when the user
 * joined. Best-effort — RLS rejects if the user isn't in the family;
 * we silently swallow that since the disconnect is happening anyway.
 */
export async function endCall(callId: string): Promise<void> {
  const supabase = createClient();

  const { data: call } = await supabase
    .from("calls")
    .select("started_at, status")
    .eq("id", callId)
    .maybeSingle();

  if (!call) return;

  const endedAt = new Date();
  let durationSeconds: number | null = null;
  if (call.started_at) {
    durationSeconds = Math.max(
      0,
      Math.round(
        (endedAt.getTime() - new Date(call.started_at).getTime()) / 1000
      )
    );
  }

  await supabase
    .from("calls")
    .update({
      status: "completed",
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", callId);

  revalidatePath("/dashboard");
  revalidatePath("/history");
}
