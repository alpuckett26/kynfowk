import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ error: "Not part of a family circle" }, { status: 403 });
    }

    const answeredResponse = await supabase
      .from("family_poll_responses")
      .select("poll_id")
      .eq("membership_id", family.membership.id);
    const answeredIds = (answeredResponse.data ?? []).map((r) => r.poll_id);

    const query = supabase
      .from("family_polls")
      .select("id, question, option_a, option_b, emoji_a, emoji_b, category")
      .order("created_at", { ascending: true })
      .limit(1);
    if (answeredIds.length > 0) {
      query.not("id", "in", `(${answeredIds.map((id) => `'${id}'`).join(",")})`);
    }
    const { data } = await query.maybeSingle();

    return Response.json({ poll: data ?? null });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
