import { getLocationShares, shareLocation, stopLocationSharing } from "@/lib/location-sharing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return { supabase, user: data.user };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return Response.json({ error: message }, { status: message === "Not signed in" ? 401 : 400 });
}

export async function GET() {
  try {
    const { supabase, user } = await auth();
    return Response.json(await getLocationShares(supabase, user.id));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await auth();
    const body = await request.json();
    return Response.json(await shareLocation(supabase, user.id, {
      latitude: Number(body.latitude), longitude: Number(body.longitude),
      accuracyMeters: body.accuracyMeters == null ? null : Number(body.accuracyMeters),
      durationHours: Number(body.durationHours),
    }));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE() {
  try {
    const { supabase, user } = await auth();
    return Response.json(await stopLocationSharing(supabase, user.id));
  } catch (error) { return errorResponse(error); }
}
