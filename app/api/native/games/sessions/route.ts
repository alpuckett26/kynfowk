import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  callId?: string;
  gameId?: string;
  participantMembershipIds?: string[];
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can start games." },
        { status: 403 }
      );
    }

    const callId = (body.callId ?? "").trim();
    const gameId = (body.gameId ?? "").trim();
    if (!callId || !gameId) {
      return Response.json(
        { error: "callId and gameId are required." },
        { status: 400 }
      );
    }

    // Confirm the call belongs to the viewer's circle.
    const callResponse = await supabase
      .from("call_sessions")
      .select("id, family_circle_id")
      .eq("id", callId)
      .maybeSingle();
    if (
      !callResponse.data ||
      callResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }

    const insertResponse = await supabase
      .from("game_sessions")
      .insert({
        call_session_id: callId,
        family_circle_id: family.circle.id,
        game_id: gameId,
        started_by_membership_id: family.membership.id,
        participants: body.participantMembershipIds ?? [],
      })
      .select("id")
      .single();
    if (insertResponse.error || !insertResponse.data) {
      return Response.json(
        { error: insertResponse.error?.message ?? "Couldn't start game." },
        { status: 400 }
      );
    }

    return Response.json({ success: true, sessionId: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
