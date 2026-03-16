import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// TEMPORARY debug endpoint for E2E test diagnostics only.
// Returns raw Supabase query results so we can understand what the server sees.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!callId) {
    return NextResponse.json({ error: "callId required" }, { status: 400 });
  }

  const [membershipRes, callRes] = await Promise.all([
    supabase
      .from("family_memberships")
      .select("id, family_circle_id, status, role, created_at")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: true }),
    supabase
      .from("call_sessions")
      .select("id, family_circle_id, status, created_by")
      .eq("id", callId)
      .maybeSingle()
  ]);

  return NextResponse.json({
    userId: user?.id,
    memberships: membershipRes.data,
    membershipError: membershipRes.error,
    call: callRes.data,
    callError: callRes.error
  });
}
