import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

type Body = { circleId?: string };

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const circleId = (body.circleId ?? "").trim();
    if (!circleId) {
      return Response.json({ error: "circleId required." }, { status: 400 });
    }

    // Confirm the user is a member of the circle.
    const checkResponse = await supabase
      .from("family_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("family_circle_id", circleId)
      .maybeSingle();
    if (!checkResponse.data) {
      return Response.json(
        { error: "You aren't a member of that circle." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("profiles")
      .update({ active_family_circle_id: circleId })
      .eq("id", user.id);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
