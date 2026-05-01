/**
 * M42 — POST /api/native/calls/[callId]/answer
 *
 * Recipient accepts an incoming ring. Marks the call as live + records
 * actual_started_at. The caller's waiting screen polls for status === "live"
 * via Supabase Realtime so they see the answer within a second.
 */

import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { callId } = await context.params;

    // Verify the caller is a participant in this call.
    const callResp = await supabase
      .from("call_sessions")
      .select(
        "id, family_circle_id, status, is_ring, call_participants(membership_id, family_memberships(user_id))"
      )
      .eq("id", callId)
      .maybeSingle();
    if (!callResp.data) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }
    const isParticipant = (callResp.data.call_participants ?? []).some((p) => {
      const fm = p.family_memberships as
        | { user_id: string | null }[]
        | { user_id: string | null }
        | null;
      const uid = Array.isArray(fm) ? fm[0]?.user_id : fm?.user_id;
      return uid === user.id;
    });
    if (!isParticipant) {
      return Response.json(
        { error: "You're not in this call." },
        { status: 403 }
      );
    }

    if (callResp.data.status === "live") {
      // Already answered — idempotent success.
      return Response.json({ success: true, callId, alreadyLive: true });
    }
    if (callResp.data.status !== "scheduled") {
      return Response.json(
        { error: `Call already ${callResp.data.status}.` },
        { status: 409 }
      );
    }

    const update = await supabase
      .from("call_sessions")
      .update({
        status: "live",
        actual_started_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .select("id")
      .single();
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 500 });
    }

    return Response.json({ success: true, callId });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
