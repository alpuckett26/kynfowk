import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionTier = "free" | "paid";

export interface ViewerBilling {
  isPaidTier: boolean;
  subscriptionTier: SubscriptionTier;
}

const DEFAULT_BILLING: ViewerBilling = {
  isPaidTier: false,
  subscriptionTier: "free",
};

/**
 * M44 — read the viewer's monetization tier off profiles. Used by the
 * <AdSlot> component to decide whether to render an ad placeholder.
 *
 * Falls back to "free" if the row is missing or the columns aren't there
 * yet (e.g. the migration hasn't run on this environment), so existing
 * surfaces keep rendering during a staged rollout instead of throwing.
 */
export async function getViewerBilling(userId: string): Promise<ViewerBilling> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_paid_tier, subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_BILLING;
  }

  const row = data as { is_paid_tier: boolean | null; subscription_tier: string | null };
  const tier: SubscriptionTier = row.subscription_tier === "paid" ? "paid" : "free";

  return {
    isPaidTier: row.is_paid_tier === true,
    subscriptionTier: tier,
  };
}
