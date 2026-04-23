import { useState, useEffect } from "react";
import { getFamilyMetrics } from "@kynfowk/connections";
import { supabase } from "@/lib/supabase";
import type { ConnectionMetrics } from "@kynfowk/types";

const DEMO_METRICS: ConnectionMetrics = {
  completedCalls: 3,
  totalMinutes: 122,
  uniqueMembersThisWeek: 4,
  streakWeeks: 4,
  connectionScore: 28,
  firstReconnections: 1,
  elderCalls: 2,
};

// DIAGNOSTIC: supabase call disabled to isolate crash source
const DISABLE_SUPABASE_CALL = true;

export function useFamilyMetrics(familyId: string) {
  const [metrics, setMetrics] = useState<ConnectionMetrics>(DEMO_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (DISABLE_SUPABASE_CALL) {
      setLoading(false);
      return;
    }

    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }

    getFamilyMetrics(supabase, familyId)
      .then(setMetrics)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [familyId]);

  return { metrics, loading, error };
}
