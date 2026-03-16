import Link from "next/link";

import { SplashScreen } from "@/components/splash-screen";

export default function HomePage() {
  return (
    <>
      <SplashScreen />

      <main className="page-shell home-page">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="home-hero container">
          <div className="home-hero-copy">
            <span className="eyebrow">For families who want to stay close</span>
            <h1 className="home-headline">
              Stop losing track of<br />
              <em className="home-headline-accent">Time Together.</em>
            </h1>
            <p className="home-lede">
              Kynfowk helps your family share real availability, find the
              best overlap, and turn good intentions into calls that
              actually happen — with zero back-and-forth.
            </p>
            <div className="home-cta-row">
              <Link className="button home-cta-primary" href="/auth/sign-up">
                Start your Family Circle
              </Link>
              <Link className="button button-ghost home-cta-secondary" href="/auth/sign-in">
                Sign in
              </Link>
            </div>
          </div>

          <div className="home-hero-visual" aria-hidden>
            <div className="home-mock-shell">
              <div className="home-mock-header">
                <span className="home-mock-dot" />
                <span className="home-mock-dot" />
                <span className="home-mock-dot" />
                <span className="home-mock-title">Family Circle Dashboard</span>
              </div>
              <div className="home-mock-body">
                <div className="home-mock-stat-row">
                  <div className="home-mock-stat">
                    <span className="home-mock-stat-num">142</span>
                    <span className="home-mock-stat-label">Minutes Together</span>
                  </div>
                  <div className="home-mock-stat">
                    <span className="home-mock-stat-num">6</span>
                    <span className="home-mock-stat-label">Calls This Month</span>
                  </div>
                </div>
                <div className="home-mock-call">
                  <span className="home-mock-call-badge">Upcoming</span>
                  <p className="home-mock-call-title">Sunday Family Check-in</p>
                  <p className="home-mock-call-meta">Sun, Dec 8 · 4:00 PM · 4 members joining</p>
                </div>
                <div className="home-mock-call home-mock-call-alt">
                  <span className="home-mock-call-badge home-mock-call-badge-done">Completed</span>
                  <p className="home-mock-call-title">Grandma &amp; Grandpa Catch-up</p>
                  <p className="home-mock-call-meta">Last week · 38 min shared</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ───────────────────────────────────────── */}
        <div className="home-trust-strip container">
          <span>✦ Built for real families</span>
          <span>✦ No ads, no noise</span>
          <span>✦ Works on any device</span>
          <span>✦ Private by design</span>
        </div>

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="home-section container">
          <div className="home-section-label">How it works</div>
          <h2 className="home-section-title">
            From scattered schedules to a call everyone can make.
          </h2>
          <div className="home-steps">
            <div className="home-step">
              <div className="home-step-num">01</div>
              <div className="home-step-body">
                <h3>Create your Family Circle</h3>
                <p>Invite parents, siblings, cousins — whoever belongs. One shared space for the whole family.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">02</div>
              <div className="home-step-body">
                <h3>Share when you're free</h3>
                <p>Each member marks their preferred hours. No polls, no group chats, no chasing replies.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">03</div>
              <div className="home-step-body">
                <h3>Schedule from real overlap</h3>
                <p>Kynfowk surfaces the best windows where everyone can actually show up — then books the call.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">04</div>
              <div className="home-step-body">
                <h3>Build your streak</h3>
                <p>Track Time Together, review recaps, and watch your Family Connections counter grow.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="home-section container">
          <div className="home-section-label">What you get</div>
          <h2 className="home-section-title">Everything a family needs. Nothing it doesn't.</h2>
          <div className="home-features">
            <div className="home-feature-card">
              <div className="home-feature-icon">📅</div>
              <h3>Overlap-based scheduling</h3>
              <p>Stop guessing. Kynfowk matches availability across your whole circle and ranks the best windows automatically.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📊</div>
              <h3>Time Together tracking</h3>
              <p>Every completed call adds to your family's Connections counter. See who's been on, how long you talked, and keep the momentum.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📝</div>
              <h3>Post-call recaps</h3>
              <p>Capture a highlight and next step right after each call while the memory is fresh. Build a living history of your family's story.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">🔔</div>
              <h3>Smart reminders</h3>
              <p>Gentle nudges 24 hours and 15 minutes before a call. No spam — just the right reminder at the right time.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">🔒</div>
              <h3>Private by default</h3>
              <p>Your family's schedule and conversations belong to your family. No ads, no data selling, no third-party access.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📱</div>
              <h3>Works anywhere</h3>
              <p>Browser, phone, or tablet — Kynfowk works wherever your family is. Add it to your home screen for one-tap access.</p>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="home-cta-section container">
          <div className="home-cta-card">
            <span className="eyebrow">Ready to reconnect?</span>
            <h2>Your family's next call is closer than you think.</h2>
            <p>Set up your Family Circle in under two minutes. No credit card. No commitment.</p>
            <Link className="button home-cta-big" href="/auth/sign-up">
              Start your Family Circle — it's free
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
