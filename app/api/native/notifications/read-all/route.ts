import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);

    const update = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
