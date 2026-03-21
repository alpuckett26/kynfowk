import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PushTokenBody {
  token:        string;
  platform:     "ios" | "android" | "web";
  app_version?: string;
  device_name?: string;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PushTokenBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, platform, app_version, device_name } = body;

  if (!token || !platform) {
    return NextResponse.json({ error: "token and platform are required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Upsert: if this token already exists (same device), update last_seen_at.
  // If the user changes (e.g. signs out and a new user signs in on same device),
  // the unique token constraint overwrites the old user_id row.
  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      {
        user_id:               user.id,
        token,
        platform,
        app_version:           app_version ?? null,
        device_name:           device_name ?? null,
        notifications_enabled: true,
        last_seen_at:          now,
        updated_at:            now,
      },
      { onConflict: "token" }
    );

  if (error) {
    console.error("[push-token] upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Called by account settings to disable notifications for this device
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json() as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("device_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
