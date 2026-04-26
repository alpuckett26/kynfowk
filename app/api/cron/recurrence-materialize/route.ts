import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/env";
import {
  materializeRecurrence,
  type RecurrenceRuleRow,
} from "@/lib/recurrence";

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
  const rulesResponse = await supabase
    .from("call_recurrence_rules")
    .select(
      "id, family_circle_id, title, description, frequency, day_of_week, day_of_month, start_local_time, duration_minutes, timezone, active, last_materialized_through"
    )
    .eq("active", true);
  if (rulesResponse.error) {
    return NextResponse.json({ error: rulesResponse.error.message }, { status: 500 });
  }

  let totalInserted = 0;
  const perRule: { id: string; inserted: number }[] = [];
  for (const rule of (rulesResponse.data ?? []) as RecurrenceRuleRow[]) {
    try {
      const r = await materializeRecurrence(supabase, rule);
      perRule.push({ id: rule.id, inserted: r.inserted });
      totalInserted += r.inserted;
    } catch (e) {
      console.error("[recurrence] rule failed", rule.id, e);
    }
  }

  return NextResponse.json({
    success: true,
    totalInserted,
    perRule,
  });
}
