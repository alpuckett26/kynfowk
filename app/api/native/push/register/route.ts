import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

type Body = { token?: string };

const EXPO_PREFIX = "expo:";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const token = (body.token ?? "").trim();
    if (!token || !token.startsWith("ExponentPushToken")) {
      return Response.json(
        { error: "Missing or invalid Expo push token." },
        { status: 400 }
      );
    }

    const endpoint = `${EXPO_PREFIX}${token}`;

    // Idempotent: upsert by endpoint. Stores empty p256dh/auth strings
    // since the existing schema requires them but Expo Push doesn't use
    // VAPID keys.
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: "",
        auth: "",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const token = (body.token ?? "").trim();
    if (!token) {
      return Response.json({ error: "Missing token." }, { status: 400 });
    }

    const endpoint = `${EXPO_PREFIX}${token}`;
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
