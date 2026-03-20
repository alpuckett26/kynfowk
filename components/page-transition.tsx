"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "showing" | "hiding">("idle");
  const prevPath = useRef(pathname);
  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(t1.current);
    clearTimeout(t2.current);

    setPhase("showing");
    t1.current = setTimeout(() => setPhase("hiding"), 380);
    t2.current = setTimeout(() => setPhase("idle"), 780);

    return () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div className={`splash${phase === "hiding" ? " splash-fade" : ""}`} aria-hidden>
      <div className="splash-inner">
        <svg className="splash-tree" viewBox="0 0 24 28" fill="currentColor" aria-hidden>
          <circle cx="12" cy="9" r="8" />
          <circle cx="7"  cy="14" r="6" />
          <circle cx="17" cy="14" r="6" />
          <rect x="10" y="19" width="4" height="9" rx="1" />
        </svg>
        <span className="splash-brand">Kynfowk</span>
        <span className="splash-tagline">Your Family Circle</span>
      </div>
    </div>
  );
}
