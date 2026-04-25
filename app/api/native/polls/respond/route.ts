import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = { pollId?: string; choice?: "a" | "b" };

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can answer polls." },
        { status: 403 }
      );
    }

    const pollId = (body.pollId ?? "").trim();
    const choice = body.choice;
    if (!pollId || (choice !== "a" && choice !== "b")) {
      return Response.json({ error: "Invalid response." }, { status: 400 });
    }

    const upsert = await supabase.from("family_poll_responses").upsert(
      {
        poll_id: pollId,
        membership_id: family.membership.id,
        family_circle_id: family.circle.id,
        choice,
      },
      { onConflict: "poll_id,membership_id" }
    );
    if (upsert.error) {
      return Response.json({ error: upsert.error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
