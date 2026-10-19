import { getLocationShares, shareLocation, stopLocationSharing } from "@/lib/location-sharing";
import { authenticateNativeRequest, nativeErrorResponse } from "@/lib/native-auth";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    return Response.json(await getLocationShares(supabase, user.id));
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = await request.json();
    return Response.json(await shareLocation(supabase, user.id, {
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      accuracyMeters: body.accuracyMeters == null ? null : Number(body.accuracyMeters),
      durationHours: Number(body.durationHours),
    }));
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    return Response.json(await stopLocationSharing(supabase, user.id));
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
