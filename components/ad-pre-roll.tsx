"use client";

import { useEffect, useState } from "react";

/**
 * M54 — soft pre-roll shown briefly above the first ad of each session.
 *
 *   "Sorry fam, gotta pay bills 🤷🏾‍♂️"
 *   "This ad helps fund your circle's pool."
 *
 * Frequency: once per session. Tracked via sessionStorage so the
 * overlay only appears the first time an AdSlot mounts in a given
 * tab. Subsequent ads carry only the muted footer caption.
 *
 * Renders as an absolutely-positioned overlay above the ad container.
 * Fades out after 1500 ms, revealing the actual ad behind it. If the
 * ad fails to load, the user still sees the friendly intro and the
 * placeholder underneath rather than empty space.
 */
const SESSION_KEY = "kynfowk_ad_intro_seen";

export function AdPreRoll() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let seen: string | null = null;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      // Private browsing / sessionStorage disabled — skip the
      // overlay entirely rather than show on every ad.
      return;
    }
    if (seen) return;

    setVisible(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* same — harmless */
    }
    const timer = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="ad-pre-roll" role="status" aria-live="polite">
      <span className="ad-pre-roll-headline">
        Sorry fam, gotta pay bills 🤷🏾‍♂️
      </span>
      <span className="ad-pre-roll-body">
        This ad helps fund your circle&apos;s pool.
      </span>
    </div>
  );
}
