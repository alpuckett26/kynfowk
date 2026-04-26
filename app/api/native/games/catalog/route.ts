import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function GET(request: Request) {
  try {
    const { supabase } = await authenticateNativeRequest(request);
    const response = await supabase
      .from("game_catalog")
      .select(
        "id, name, description, category, min_players, max_players, duration_label, pace"
      )
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (response.error) {
      return Response.json({ error: response.error.message }, { status: 400 });
    }
    return Response.json({ games: response.data ?? [] });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
