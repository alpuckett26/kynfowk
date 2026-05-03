/**
 * POST /api/upgrade/square-subscribe
 *
 * Body: { cardNonce: string }
 *
 * Server-side flow when a web user submits the SquarePaymentForm:
 *   1. Authenticate the cookie session (requireViewer).
 *   2. Look up or create the Square Customer keyed on the user id.
 *   3. Attach the tokenized card to that customer.
 *   4. Create a recurring subscription against the configured plan.
 *   5. Save the Square IDs back onto profiles + flip is_paid_tier.
 *   6. Return { ok: true } so the client can redirect to /dashboard#earn.
 *
 * Errors return 4xx/5xx with a friendly message — the client surfaces
 * them as inline form errors. Square's own error codes get mapped to
 * generic "card declined" / "try again" messaging so we don't leak
 * internals.
 */

import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/data";
import {
  attachCardToCustomer,
  createSquareSubscription,
  getOrCreateSquareCustomer,
  isSquareConfigured,
} from "@/lib/square";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Body {
  cardNonce?: string;
}

export async function POST(request: Request) {
  if (!isSquareConfigured()) {
    return Response.json(
      { error: "Plus checkout isn't configured on this environment yet." },
      { status: 503 }
    );
  }

  const user = await requireViewer().catch(() => null);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const cardNonce = body.cardNonce;
  if (!cardNonce || typeof cardNonce !== "string") {
    return Response.json({ error: "Card details required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Pull the viewer's display name + email for the Customer record.
  const profileResp = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileResp.data as
    | { email: string | null; full_name: string | null }
    | null;
  const email = profile?.email ?? user.email ?? null;
  if (!email) {
    return Response.json(
      { error: "We couldn't find your email — update Settings and try again." },
      { status: 400 }
    );
  }

  try {
    const customer = await getOrCreateSquareCustomer({
      userId: user.id,
      email,
      givenName: profile?.full_name?.split(/\s+/)[0] ?? null,
    });

    const { cardId } = await attachCardToCustomer({
      customerId: customer.id,
      cardNonce,
    });

    const subscription = await createSquareSubscription({
      customerId: customer.id,
      cardId,
    });

    const update = await supabase
      .from("profiles")
      .update({
        is_paid_tier: true,
        subscription_tier: "paid",
        square_customer_id: customer.id,
        square_subscription_id: subscription.id,
      })
      .eq("id", user.id);

    if (update.error) {
      console.error("[square-subscribe] profile update failed:", update.error);
      return Response.json(
        { error: "Card was charged but we couldn't update your account. Contact support." },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
        startDate: subscription.start_date ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Couldn't charge the card.";
    const squareCodes =
      err && typeof err === "object" && "squareErrors" in err
        ? (err as { squareErrors?: Array<{ code: string; detail?: string; field?: string }> })
            .squareErrors
        : undefined;
    console.warn(
      "[square-subscribe] failed:",
      detail,
      squareCodes ? JSON.stringify(squareCodes) : ""
    );

    // Map common Square error codes to friendly messaging.
    const lower = detail.toLowerCase();
    if (lower.includes("card_declined") || lower.includes("declined")) {
      return Response.json(
        { error: "Your card was declined. Try a different card." },
        { status: 402 }
      );
    }
    if (lower.includes("cvv") || lower.includes("postal")) {
      return Response.json(
        { error: "Card verification failed — double-check the CVV and ZIP." },
        { status: 400 }
      );
    }

    // Sandbox surfaces the raw Square detail so it's debuggable from
    // the UI without hunting Vercel logs. Production hides it.
    const isSandbox = process.env.SQUARE_ENV !== "production";
    return Response.json(
      {
        error: isSandbox
          ? `Square: ${detail}`
          : "Couldn't complete the charge. Try again in a moment.",
        squareCodes: isSandbox ? squareCodes : undefined,
      },
      { status: 500 }
    );
  }

  // Unreachable, but keeps the redirect import in scope for future
  // server-action variant if we move away from JSON responses.
  redirect("/dashboard#earn");
}
