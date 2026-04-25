import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getCallDetailSnapshot } from "@/lib/data";

export async function GET(
  request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { callId } = await context.params;
    const snapshot = await getCallDetailSnapshot(supabase, user.id, callId);
    if (!snapshot) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }
    return Response.json({ snapshot });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
