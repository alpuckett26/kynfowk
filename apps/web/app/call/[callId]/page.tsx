import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isLiveKitConfigured,
  issueLiveKitToken,
  getLiveKitConfig,
} from "@/lib/livekit";
import { DEMO_CALL_ID } from "@/lib/connections";
import { CallRoom } from "./CallRoom";
import { CallPlaceholder } from "./CallPlaceholder";

export const metadata: Metadata = {
  title: "In Call",
  description: "Live family call.",
};

export default async function CallPage({
  params,
}: {
  params: { callId: string };
}) {
  // Demo path or LiveKit not configured → placeholder.
  if (params.callId === DEMO_CALL_ID || !isLiveKitConfigured()) {
    return <CallPlaceholder callId={params.callId} />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/call/${params.callId}`);
  }

  // Verify the call exists and belongs to the user's family. RLS filters
  // SELECT to the user's family, so a missing row means either invalid
  // call id or not their family.
  const { data: call } = await supabase
    .from("calls")
    .select("id, title")
    .eq("id", params.callId)
    .maybeSingle();

  if (!call) {
    return <CallPlaceholder callId={params.callId} />;
  }

  // Mint a LiveKit token for this user + this room.
  const cfg = getLiveKitConfig()!;
  const { data: me } = await supabase
    .from("family_members")
    .select("id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const token = await issueLiveKitToken({
    identity: user.id,
    name: me?.display_name ?? user.email ?? "Member",
    roomName: params.callId,
  });

  // Best-effort: mark the call in_progress when someone joins. Failures
  // are non-fatal; the call still happens regardless.
  await supabase
    .from("calls")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", params.callId)
    .eq("status", "scheduled");

  // Record this user's participation. The connection-score trigger
  // (002_connection_score_function.sql, on_call_completed) iterates
  // call_participants when status flips to 'completed' to insert
  // connection_events — without a row here, no score is awarded.
  // Idempotent via the unique(call_id, member_id) constraint.
  if (me?.id) {
    await supabase.from("call_participants").upsert(
      {
        call_id: params.callId,
        member_id: me.id,
      },
      { onConflict: "call_id,member_id", ignoreDuplicates: true }
    );
  }

  return <CallRoom url={cfg.url} token={token} callId={params.callId} />;
}
