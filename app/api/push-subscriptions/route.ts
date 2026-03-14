import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackProductEvent } from "@/lib/product-insights";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Incomplete push subscription." }, { status: 400 });
  }

  const response = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      last_seen_at: new Date().toISOString()
    },
    {
      onConflict: "endpoint"
    }
  );

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 });
  }

  await trackProductEvent(supabase, {
    eventName: "push_enabled",
    userId: user.id
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");

  let query = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const response = await query;

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
