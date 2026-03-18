"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const prevPath = useRef(pathname);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(fadeTimer.current);
    clearTimeout(hideTimer.current);

    setFading(false);
    setVisible(true);

    fadeTimer.current = setTimeout(() => setFading(true), 350);
    hideTimer.current = setTimeout(() => setVisible(false), 700);

    return () => {
      clearTimeout(fadeTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className={`page-transition ${fading ? "page-transition-fade" : ""}`} aria-hidden>
      <span className="page-transition-brand">Kynfowk</span>
    </div>
  );
}
