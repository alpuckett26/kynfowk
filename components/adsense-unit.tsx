"use client";

import { useEffect, useRef } from "react";

import { AdPreRoll } from "@/components/ad-pre-roll";

/**
 * M54 — actual AdSense ad unit.
 *
 * Renders the standard `<ins class="adsbygoogle">` element and pushes
 * an empty config object onto the global `adsbygoogle` queue on mount,
 * which is what tells the AdSense script to fill the slot. The script
 * itself is loaded once globally in app/layout.tsx via next/script.
 *
 * Stacks the AdPreRoll overlay above the unit on first session
 * impression so the ad break feels intentional instead of jarring.
 *
 * Also bumps a per-session impression counter (sessionStorage key
 * `kynfowk_ad_impressions`) so we can assert ads-per-visit density.
 * Inspect in DevTools → Application → Session Storage to verify.
 */
declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const IMPRESSION_KEY = "kynfowk_ad_impressions";

function bumpImpressionCounter(placement: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(IMPRESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[placement] = (parsed[placement] ?? 0) + 1;
    parsed.__total = (parsed.__total ?? 0) + 1;
    window.sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify(parsed));
  } catch {
    /* sessionStorage unavailable / quota — non-critical, skip */
  }
}

export function AdSenseUnit({
  client,
  slot,
  placement,
  size,
}: {
  client: string;
  slot: string;
  placement: string;
  size: "leaderboard" | "rectangle" | "skyscraper";
}) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    bumpImpressionCounter(placement);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // AdSense not loaded yet (e.g. during HMR before <Script> mounts)
      // or blocked by an extension. Either way the ad just doesn't fill;
      // the placeholder below stays visible.
      console.warn("[adsbygoogle] push failed", err);
    }
  }, [placement]);

  return (
    <div
      className={`ad-slot ad-slot-live ad-slot-${size}`}
      data-placement={placement}
    >
      <AdPreRoll />
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <span className="ad-slot-caption">
        This ad helps fund your circle&apos;s pool.
      </span>
    </div>
  );
}
