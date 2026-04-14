import { useState, useEffect } from "react";
import { getAllTimeStats } from "@kynfowk/connections";
import { supabase } from "@/lib/supabase";
import type { AllTimeStats } from "@kynfowk/connections";

const DEMO_STATS: AllTimeStats = {
  totalCalls: 47,
  totalMinutes: 2340,
  totalScore: 210,
  bestWeekScore: 28,
  longestStreak: 8,
};

export function useAllTimeStats(familyId: string) {
  const [stats, setStats] = useState<AllTimeStats>(DEMO_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }

    getAllTimeStats(supabase, familyId)
      .then(setStats)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [familyId]);

  return { stats, loading, error };
}
