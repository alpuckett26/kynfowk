/**
 * M42 — POST /api/native/calls/[callId]/decline
 *
 * Recipient declines an incoming ring. Marks the call as canceled and
 * sends a "call_declined" push back to the caller so they get an
 * immediate "Janet declined" toast.
 */

import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { sendPush } from "@/lib/send-push";

export async function POST(
  request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { callId } = await context.params;

    const callResp = await supabase
      .from("call_sessions")
      .select(
        "id, family_circle_id, status, is_ring, created_by, call_participants(membership_id, family_memberships(user_id, display_name))"
      )
      .eq("id", callId)
      .maybeSingle();
    if (!callResp.data) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }

    const participants = callResp.data.call_participants ?? [];
    const meAsMember = participants.find((p) => {
      const fm = p.family_memberships as
        | { user_id: string | null; display_name: string }[]
        | { user_id: string | null; display_name: string }
        | null;
      const uid = Array.isArray(fm) ? fm[0]?.user_id : fm?.user_id;
      return uid === user.id;
    });
    if (!meAsMember) {
      return Response.json(
        { error: "You're not in this call." },
        { status: 403 }
      );
    }

    if (callResp.data.status === "canceled" || callResp.data.status === "completed") {
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

    // Push the caller (created_by) so they see "Janet declined" right
    // away. Skip if the decliner == caller (degenerate).
    if (callResp.data.created_by && callResp.data.created_by !== user.id) {
      const meFm = meAsMember.family_memberships as
        | { user_id: string | null; display_name: string }[]
        | { user_id: string | null; display_name: string }
        | null;
      const declinerName = Array.isArray(meFm)
        ? meFm[0]?.display_name
        : meFm?.display_name;
      try {
        await sendPush({
          userIds: [callResp.data.created_by],
          title: `${declinerName ?? "They"} declined`,
          body: "They couldn't pick up right now.",
          data: {
            type: "call_declined",
            callId,
            declinerName: declinerName ?? "Family member",
          },
        });
      } catch (e) {
        console.error("[decline] sendPush failed:", e);
      }
    }

    return Response.json({ success: true, callId });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
