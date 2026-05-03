import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SquarePaymentForm } from "@/components/square-payment-form";
import { requireViewer } from "@/lib/data";
import { getViewerBilling } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Upgrade to Plus — Kynfowk",
  description:
    "Remove ads, support the family rewards pool, and unlock Plus-only perks.",
};

/**
 * M61 — web Plus subscription checkout. Server component that:
 *   - Confirms the viewer is signed in.
 *   - Bounces them back to the dashboard if they're already paid.
 *   - Renders the SquarePaymentForm with the public Square IDs from
 *     env vars. SquarePaymentForm itself handles the Web Payments SDK
 *     load + tokenize + POST flow.
 */
export default async function UpgradePage() {
  const user = await requireViewer();
  const billing = await getViewerBilling(user.id);
  if (billing.isPaidTier) {
    redirect("/dashboard?status=already-plus");
  }

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? null;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? null;
  const environment =
    process.env.NEXT_PUBLIC_SQUARE_ENV === "production"
      ? "production"
      : "sandbox";

  return (
    <main className="page-shell legal-page">
      <article className="container stack-lg">
        <header>
          <span className="eyebrow">Kynfowk Plus</span>
          <h1>Make family time more rewarding.</h1>
          <p className="meta">
            $9.99 per month. Cancel anytime.
          </p>
        </header>

        <section className="stack-md">
          <p>What changes:</p>
          <ul>
            <li>No more ads on any Kynfowk surface.</li>
            <li>Higher share of the monthly rewards pool — Plus circles get priority weighting.</li>
            <li>Early access to new features as they ship (rewarded video, Give Time, referral payouts).</li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>Card details</h2>
          <SquarePaymentForm
            applicationId={applicationId}
            locationId={locationId}
            environment={environment}
          />
        </section>

        <p className="microcopy">
          Already a Plus member? <Link href={"/settings" as Route}>Manage from Settings</Link>.
        </p>
      </article>
    </main>
  );
}
