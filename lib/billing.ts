import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 * <AdSlot> component (web) and the /api/native/profile/billing
 * endpoint (mobile, M60) to decide whether to render an ad.
 *
 * Falls back to "free" if the row is missing or the columns aren't
 * there yet (e.g. the migration hasn't run on this environment) so
 * existing surfaces keep rendering during a staged rollout instead
 * of throwing.
 *
 * `supabase` is optional. When called from a Next.js server component
 * (cookie-based session) we leave it undefined and create the client
 * here. When called from a /api/native route (bearer-token session)
 * we pass in the bearer-scoped client so the RLS check sees the
 * right user.
 */
export async function getViewerBilling(
  userId: string,
  supabase?: SupabaseClient
): Promise<ViewerBilling> {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
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
