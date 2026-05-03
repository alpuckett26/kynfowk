/**
 * GET /api/native/profile/billing
 *
 * Returns the viewer's billing snapshot — { isPaidTier, subscriptionTier }.
 * Used by the mobile AdBanner / AdInterstitial components to decide
 * whether to render an ad. Same logic + same fallback as the web's
 * `lib/billing.ts` `getViewerBilling()`, exposed as a thin native
 * endpoint so the mobile app doesn't need to query Supabase directly.
 *
 * Returns 200 with billing snapshot, 401 if no bearer token.
 */

import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerBilling } from "@/lib/billing";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const billing = await getViewerBilling(user.id, supabase);
    return Response.json(billing, { status: 200 });
  } catch (err) {
    return nativeErrorResponse(err);
  }
}
