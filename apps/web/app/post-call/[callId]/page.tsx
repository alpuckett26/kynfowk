"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCallSummary } from "@/components/PostCallSummary";
import { createClient } from "@/lib/supabase/client";
import type { CallSummaryMetrics } from "@/lib/connections";

const DEMO_SUMMARY: CallSummaryMetrics = {
  durationMinutes: 45,
  participantCount: 4,
  scoreEarned: 5,
  events: [
    "Connection made",
    "Quality time (10+ min)",
    "Group connection (3+ members)",
    "Elder included",
  ],
};

async function fetchCallSummary(callId: string): Promise<CallSummaryMetrics> {
  const supabase = createClient();

  const { data: call } = await supabase
    .from("calls")
    .select("duration_seconds, participant_count")
    .eq("id", callId)
    .maybeSingle();

  if (!call) return DEMO_SUMMARY;

  const { data: events } = await supabase
    .from("connection_events")
    .select("event_type, score_delta")
    .eq("call_id", callId);

  const evtList = (events ?? []) as {
    event_type: string;
    score_delta: number;
  }[];

  const seen = new Set<string>();
  const deduped = evtList.filter((e) => {
    if (seen.has(e.event_type)) return false;
    seen.add(e.event_type);
    return true;
  });

  const scoreEarned = evtList.reduce((sum, e) => sum + e.score_delta, 0);

  const eventLabels: Record<string, string> = {
    call_completed: "Connection made",
    long_call: "Quality time (10+ min)",
    group_call: "Group connection (3+ members)",
    reconnection: "Reconnection after a long time",
    elder_call: "Elder included",
  };

  return {
    durationMinutes: Math.floor((call.duration_seconds ?? 0) / 60),
    participantCount: call.participant_count ?? 0,
    scoreEarned,
    events: deduped.map((e) => eventLabels[e.event_type] ?? e.event_type),
  };
}

export default function PostCallPage({
  params,
}: {
  params: { callId: string };
}) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<CallSummaryMetrics | null>(null);

  useEffect(() => {
    const isDemoCall =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      params.callId === "demo-call-id";

    if (isDemoCall) {
      setMetrics(DEMO_SUMMARY);
      return;
    }

    fetchCallSummary(params.callId).then(setMetrics);
  }, [params.callId]);

  if (!metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-warm-50">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-brand-100 animate-pulse mx-auto" />
          <p className="text-sm text-gray-500">Loading your call summary…</p>
        </div>
      </div>
    );
  }

  return (
    <PostCallSummary
      metrics={metrics}
      familyName="Henderson"
      onDone={() => router.push("/dashboard")}
    />
  );
}
