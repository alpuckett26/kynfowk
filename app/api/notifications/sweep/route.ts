import { NextResponse } from "next/server";

import { hasSupabaseServiceRoleEnv } from "@/lib/env";
import { sweepAllNotifications } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("secret");

  return bearerToken === secret || queryToken === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Supabase service role env vars are missing." },
      { status: 503 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const result = await sweepAllNotifications(supabase);

  return NextResponse.json({
    ok: true,
    ...result,
    ranAt: new Date().toISOString()
  });
}

export const POST = GET;
