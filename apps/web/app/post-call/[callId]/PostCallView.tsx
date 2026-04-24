"use client";

import { useRouter } from "next/navigation";
import { PostCallSummary } from "@/components/PostCallSummary";
import type { CallSummaryMetrics } from "@/lib/connections";

/**
 * Client island for the post-call screen — exists only because PostCallSummary
 * takes an onDone callback for navigation. Wraps the summary view and pushes
 * to /dashboard on done.
 */
export function PostCallView({
  metrics,
  familyName,
}: {
  metrics: CallSummaryMetrics;
  familyName: string;
}) {
  const router = useRouter();

  return (
    <PostCallSummary
      metrics={metrics}
      familyName={familyName}
      onDone={() => router.push("/dashboard")}
    />
  );
}
