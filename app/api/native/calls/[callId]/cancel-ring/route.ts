/**
 * M42 — POST /api/native/calls/[callId]/cancel-ring
 *
 * Caller cancels their own ring (timeout fired, hit cancel button, or
 * navigated away). Marks the call as canceled. Only valid for is_ring
 * calls in 'scheduled' status — a live call should be ended via the
 * normal /complete or /end-call endpoint, not this one.
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

    const callResp = await supabase
      .from("call_sessions")
      .select("id, status, is_ring, created_by")
      .eq("id", callId)
      .maybeSingle();
    if (!callResp.data) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }
    if (callResp.data.created_by !== user.id) {
      return Response.json(
        { error: "Only the caller can cancel a ring." },
        { status: 403 }
      );
    }
    if (!callResp.data.is_ring) {
      return Response.json(
        { error: "Use the normal cancel flow for scheduled calls." },
        { status: 400 }
      );
    }
    if (callResp.data.status !== "scheduled") {
      return Response.json({ success: true, callId, alreadyClosed: true });
    }

    const update = await supabase
      .from("call_sessions")
      .update({ status: "canceled" })
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
