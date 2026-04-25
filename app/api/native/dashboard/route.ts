import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getDashboardSnapshot } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const snapshot = await getDashboardSnapshot(supabase, user.id);
    if (!snapshot) {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }
    return Response.json({ needsOnboarding: false, snapshot });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
