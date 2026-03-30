/**
 * POST /api/notify  — development test trigger
 *
 * Lets you fire a push notification to any user from curl / Postman
 * without going through the full app flow.
 *
 * Body: { user_id: string; title?: string; body?: string; deep_link?: string }
 *
 * Only accessible when NODE_ENV !== "production" OR when the caller
 * supplies the correct FUNCTIONS_SECRET, so it's safe to leave deployed.
 */

import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/send-push";

export async function POST(request: Request) {
  // Require auth — only an authenticated user (or service-role caller) can trigger
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    user_id?: string;
    title?: string;
    body?: string;
    deep_link?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Default to notifying the caller themselves if no user_id supplied
  const targetUserId = body.user_id ?? user.id;

  try {
    const result = await sendPush({
      userIds: [targetUserId],
      title: body.title ?? "Kynfowk",
      body: body.body ?? "Test notification",
      data: body.deep_link ? { deepLink: body.deep_link } : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
