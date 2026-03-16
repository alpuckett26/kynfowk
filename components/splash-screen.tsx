"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"loading" | "visible" | "fading" | "gone">("loading");

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem("kynfowk_splash_shown")) {
      setPhase("gone");
      return;
    }
    sessionStorage.setItem("kynfowk_splash_shown", "1");
    setPhase("visible");

    const fadeTimer = setTimeout(() => setPhase("fading"), 1400);
    const removeTimer = setTimeout(() => setPhase("gone"), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "loading" || phase === "gone") return null;

  return (
    <div className={`splash ${phase === "fading" ? "splash-fade" : ""}`} aria-hidden>
      <div className="splash-inner">
        <span className="splash-brand">Kynfowk</span>
        <span className="splash-tagline">Time Together, made easy.</span>
      </div>
    </div>
  );
}
