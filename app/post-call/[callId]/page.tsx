"use client";

import { useRouter } from "next/navigation";
import { PostCallSummary } from "@/components/PostCallSummary";
import type { CallSummaryMetrics } from "@/lib/connections";

// Demo metrics for when Supabase is not connected
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

export default function PostCallPage() {
  const router = useRouter();

  // In production, fetch via server action or API route using params.callId
  const metrics = DEMO_SUMMARY;

  return (
    <PostCallSummary
      metrics={metrics}
      familyName="Henderson"
      onDone={() => router.push("/dashboard")}
    />
  );
}
