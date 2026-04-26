import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import {
  buildAvailabilitySummary,
  getAvailabilitySlotKey,
  type AvailabilityWindowLike,
} from "@/lib/availability";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }

    const windowsResponse = await supabase
      .from("availability_windows")
      .select("weekday, start_hour, end_hour")
      .eq("family_circle_id", family.circle.id)
      .eq("membership_id", family.membership.id)
      .order("weekday", { ascending: true })
      .order("start_hour", { ascending: true });

    const windows = (windowsResponse.data ?? []) as AvailabilityWindowLike[];
    const slots = windows.map((w) => getAvailabilitySlotKey(w));
    const summary = buildAvailabilitySummary(windows);

    return Response.json({
      needsOnboarding: false,
      circle: family.circle,
      membershipId: family.membership.id,
      slots,
      windows,
      summary,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
