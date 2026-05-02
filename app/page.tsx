import type { Route } from "next";
import Link from "next/link";

import { Card } from "@/components/card";
import { SplashScreen } from "@/components/splash-screen";
import { getViewer, getViewerFamilyCircle } from "@/lib/data";

/**
 * M50 — landing rebuilt as four vertical snap-scroll sections, each
 * one viewport tall: Hero / What you do / Real families / Final CTA.
 * Drops the trust-strip + 4-step "How it works" + 6-card Features
 * stacks so the user never scrolls through dense paragraphs to find
 * the CTA. Each section flicks cleanly into the next.
 */
export default async function HomePage() {
  const viewer = await getViewer();
  const family = viewer ? await getViewerFamilyCircle(viewer.id) : null;
  const isSignedIn = !!viewer;
  const hasCircle = !!family;

  const primaryHref: Route = hasCircle
    ? "/dashboard"
    : isSignedIn
      ? ("/onboarding" as Route)
      : ("/auth/sign-up" as Route);
  const primaryLabel = hasCircle
    ? "Open your Family Circle"
    : isSignedIn
      ? "Finish setting up your Family Circle"
      : "Start your Family Circle";

  return (
    <>
      <SplashScreen />

      <main className="landing-track">
        {/* Hero */}
        <section className="landing-section">
          <div className="container">
            <span className="eyebrow">Family video calls, made effortless</span>
            <h1
              style={{
                fontFamily: "var(--font-display, Georgia), serif",
                fontSize: "clamp(2.4rem, 7vw, 4rem)",
                lineHeight: 1.05,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              A family that is more connected{" "}
              <em style={{ color: "var(--accent)", fontStyle: "normal" }}>
                earns more.
              </em>
            </h1>
            <p style={{ fontSize: "1.15rem", color: "var(--muted)" }}>
              Kynfowk finds the window where your whole family can actually
              get on a video call together — then rewards you for showing up.
              Real points. Real cash. Real time together.
            </p>
            <div className="landing-cta-row">
              <Link className="button button-primary" href={primaryHref}>
                {primaryLabel}
              </Link>
              {!isSignedIn ? (
                <Link className="button button-secondary" href="/auth/sign-in">
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* What you do */}
        <section className="landing-section">
          <div className="container">
            <span className="eyebrow">What you do here</span>
            <h2
              style={{
                fontFamily: "var(--font-display, Georgia), serif",
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                margin: 0,
              }}
            >
              Three jobs. One simple loop.
            </h2>
            <div className="landing-three-up">
              <Card>
                <h3 style={{ margin: 0 }}>Connect</h3>
                <p className="meta">
                  Ring family in one tap. Or join the next scheduled call from
                  the built-in video room.
                </p>
              </Card>
              <Card>
                <h3 style={{ margin: 0 }}>Plan</h3>
                <p className="meta">
                  Each member shares the windows that work. Kynfowk finds the
                  overlap and books the call.
                </p>
              </Card>
              <Card>
                <h3 style={{ margin: 0 }}>Earn</h3>
                <p className="meta">
                  Showing up grows your Connection Score. Real points, real
                  cash, real time together.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Real families */}
        <section className="landing-section">
          <div className="container">
            <span className="eyebrow">Real families</span>
            <h2
              style={{
                fontFamily: "var(--font-display, Georgia), serif",
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                margin: 0,
              }}
            >
              Stories from circles that made the habit stick.
            </h2>
            <Card>
              <p
                style={{
                  fontSize: "1.15rem",
                  fontStyle: "italic",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                &ldquo;Having a call on the calendar — even when it moved — was
                the difference between dread and anticipation.&rdquo;
              </p>
              <p className="meta" style={{ marginTop: "0.75rem" }}>
                Military deployment · 9 months · 31 calls
              </p>
            </Card>
            <Link className="button button-secondary" href="/case-studies">
              Read more stories
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="landing-section">
          <div className="container">
            <span className="eyebrow">Ready when you are</span>
            <h2
              style={{
                fontFamily: "var(--font-display, Georgia), serif",
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                margin: 0,
              }}
            >
              Your family&apos;s next call is closer than you think.
            </h2>
            <p className="meta">
              Set up your Family Circle in under two minutes. No credit card.
            </p>
            <div className="landing-cta-row">
              <Link className="button button-primary" href={primaryHref}>
                {primaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
