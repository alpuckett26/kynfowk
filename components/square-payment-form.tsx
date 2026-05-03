"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * M61 — Square Web Payments SDK form for the Plus subscription
 * checkout. Loads Square's web-sdk script, renders the embedded card
 * input, tokenizes on submit, and POSTs the nonce to
 * /api/upgrade/square-subscribe.
 *
 * Requires three NEXT_PUBLIC_ env vars (set on Vercel after Square
 * Dashboard configuration):
 *   NEXT_PUBLIC_SQUARE_APPLICATION_ID  "sandbox-sq0idb-..." or live form
 *   NEXT_PUBLIC_SQUARE_LOCATION_ID     same as the server-side LOCATION_ID
 *   NEXT_PUBLIC_SQUARE_ENV             "sandbox" or "production"
 *
 * Falls back to a "Plus checkout coming soon" placeholder when the
 * env vars aren't set — mirrors the AdSlot pattern so dev / preview
 * still render without throwing.
 */

const SDK_SRC_SANDBOX = "https://sandbox.web.squarecdn.com/v1/square.js";
const SDK_SRC_PRODUCTION = "https://web.squarecdn.com/v1/square.js";

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{
    status: "OK" | "ERROR";
    token?: string;
    errors?: Array<{ message?: string }>;
  }>;
  destroy: () => Promise<void>;
};

type SquarePayments = {
  card: () => Promise<SquareCard>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments;
    };
  }
}

export function SquarePaymentForm({
  applicationId,
  locationId,
  environment,
  onSuccess,
}: {
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production";
  onSuccess?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mount the card input once the Square SDK script has loaded.
  useEffect(() => {
    if (!scriptReady || !applicationId || !locationId) return;
    if (!window.Square) return;
    let cancelled = false;
    (async () => {
      try {
        const payments = window.Square!.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#sq-card-container");
        cardRef.current = card;
        setCardReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't load the card form. Reload and try again."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => undefined);
      cardRef.current = null;
    };
  }, [scriptReady, applicationId, locationId]);

  if (!applicationId || !locationId) {
    return (
      <div className="card">
        <p className="meta">
          Plus checkout isn&apos;t configured on this environment yet. Try
          again once Square goes live, or upgrade in the iPhone app.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!cardRef.current || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        setError(
          result.errors?.[0]?.message ??
            "Couldn't read the card details. Re-enter and try again."
        );
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/upgrade/square-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNonce: result.token }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Couldn't complete the upgrade.");
        setSubmitting(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Default: bounce to the dashboard with a status banner.
        window.location.assign("/dashboard?status=plus-activated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete the upgrade.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script
        src={environment === "production" ? SDK_SRC_PRODUCTION : SDK_SRC_SANDBOX}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="square-payment-form stack-md">
        <div id="sq-card-container" ref={containerRef} className="square-card-container" />
        {error ? <p className="form-message">{error}</p> : null}
        <button
          type="button"
          className="button button-primary"
          disabled={!cardReady || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting
            ? "Processing…"
            : cardReady
              ? "Upgrade to Plus"
              : "Loading card form…"}
        </button>
        <p className="microcopy">
          Square handles your card details. We never see them. Cancel anytime
          from Settings; cancellation takes effect at the end of the billing
          period.
        </p>
      </div>
    </>
  );
}
