"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "entering" | "leaving">("idle");
  const prevPath = useRef(pathname);
  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(t1.current);
    clearTimeout(t2.current);

    setPhase("entering");
    t1.current = setTimeout(() => setPhase("leaving"), 420);
    t2.current = setTimeout(() => setPhase("idle"), 800);

    return () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div className={`page-turn-overlay page-turn-${phase}`} aria-hidden>
      <div className="page-turn-page">
        <div className="page-turn-ruled" />
        <div className="page-turn-margin" />
        <div className="page-turn-content">
          <span className="page-turn-brand">Kynfowk</span>
          <span className="page-turn-tagline">Family Circle</span>
        </div>
        <div className="page-turn-holes">
          <div className="page-turn-hole" />
          <div className="page-turn-hole" />
          <div className="page-turn-hole" />
        </div>
      </div>
    </div>
  );
}
