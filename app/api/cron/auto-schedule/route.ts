import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/env";
import {
  runAutoScheduleForUser,
  type AutoScheduleResult,
} from "@/lib/auto-schedule";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(request.url);
  const query = url.searchParams.get("secret");
  return bearer === secret || query === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const usersResponse = await supabase
    .from("profiles")
    .select("id")
    .eq("auto_schedule_enabled", true);
  if (usersResponse.error) {
    return NextResponse.json(
      { error: usersResponse.error.message },
      { status: 500 }
    );
  }

  const aggregate: AutoScheduleResult = {
    attempted: 0,
    scheduled: 0,
    skippedByCooldown: 0,
    skippedByNoOverlap: 0,
    skippedByMinorParent: 0,
    skippedByCap: 0,
    skippedByConsent: 0,
  };
  const perUser: Array<{ userId: string; result: AutoScheduleResult }> = [];

  for (const row of (usersResponse.data ?? []) as { id: string }[]) {
    try {
      const result = await runAutoScheduleForUser(supabase, row.id);
      perUser.push({ userId: row.id, result });
      aggregate.attempted += result.attempted;
      aggregate.scheduled += result.scheduled;
      aggregate.skippedByCooldown += result.skippedByCooldown;
      aggregate.skippedByNoOverlap += result.skippedByNoOverlap;
      aggregate.skippedByMinorParent += result.skippedByMinorParent;
      aggregate.skippedByCap += result.skippedByCap;
      aggregate.skippedByConsent += result.skippedByConsent;
    } catch (e) {
      console.error("[auto-schedule] user failed", row.id, e);
    }
  }

  return NextResponse.json({
    success: true,
    aggregate,
    perUser,
  });
}
