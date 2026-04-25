// Re-export types from the shared package
export type {
  CallSummaryMetrics,
  AllTimeStats,
} from "@kynfowk/connections";

// Web-specific wrappers that inject the server-side Supabase client
import { createClient } from "@/lib/supabase/server";
import {
  getFamilyMetrics as _getFamilyMetrics,
  getCallSummary as _getCallSummary,
  getAllTimeStats as _getAllTimeStats,
} from "@kynfowk/connections";
import type { ConnectionMetrics } from "@kynfowk/types";
import type { CallSummaryMetrics, AllTimeStats } from "@kynfowk/connections";

export async function getFamilyMetrics(
  familyId: string
): Promise<ConnectionMetrics> {
  const supabase = createClient();
  return _getFamilyMetrics(supabase, familyId);
}

export async function getCallSummary(
  callId: string
): Promise<CallSummaryMetrics> {
  const supabase = createClient();
  return _getCallSummary(supabase, callId);
}

export async function getAllTimeStats(familyId: string): Promise<AllTimeStats> {
  const supabase = createClient();
  return _getAllTimeStats(supabase, familyId);
}
