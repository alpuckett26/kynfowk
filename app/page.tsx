import Link from "next/link";

import { FamilyPhotoCarousel } from "@/components/family-photo-carousel";
import { SplashScreen } from "@/components/splash-screen";
import {
  getCircleCarouselPhotos,
  getHomepageStats,
  getViewer,
  getViewerFamilyCircle
} from "@/lib/data";

export default async function HomePage() {
  const [stats, viewer] = await Promise.all([getHomepageStats(), getViewer()]);
  const family = viewer ? await getViewerFamilyCircle(viewer.id) : null;
  const carouselPhotos = viewer ? await getCircleCarouselPhotos(viewer.id) : [];
  const isSignedIn = !!viewer;
  const hasCircle = !!family;
  const firstName = family?.membership.display_name?.split(" ")[0] ?? null;
  return (
    <>
      <SplashScreen />

      <main className="page-shell home-page">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="home-hero container">
          <div className="home-hero-copy">
            <span className="eyebrow">Family video calls, made effortless</span>
            <h1 className="home-headline">
              Stop missing each other.<br />
              <em className="home-headline-accent">Start showing up.</em>
            </h1>
            <p className="home-lede">
              Kynfowk finds the window where your whole family can actually
              get on a video call together — then puts it on the calendar
              automatically. No back-and-forth. No forgotten plans.
            </p>
            {hasCircle ? (
              <div className="home-cta-row home-cta-row-personal">
                <p className="home-greeting">
                  What up, fam?{firstName ? ` (${firstName})` : ""}
                </p>
                <Link className="button home-cta-primary" href="/dashboard">
                  Go to Dashboard
                </Link>
              </div>
            ) : isSignedIn ? (
              <div className="home-cta-row">
                <Link className="button home-cta-primary" href="/onboarding">
                  Finish setting up your Family Circle
                </Link>
              </div>
            ) : (
              <div className="home-cta-row">
                <Link className="button home-cta-primary" href="/auth/sign-up">
                  Start your Family Circle
                </Link>
                <Link className="button button-ghost home-cta-secondary" href="/auth/sign-in">
                  Sign in
                </Link>
              </div>
            )}
          </div>

          {/* ── Mock call detail (mirrors the actual call page UX) ── */}
          <div className="home-hero-visual" aria-hidden>
            <div className="home-mock-shell">
              <div className="home-mock-header">
                <span className="home-mock-dot" />
                <span className="home-mock-dot" />
                <span className="home-mock-dot" />
                <span className="home-mock-title">Ellis Family Circle</span>
              </div>
              <div className="home-mock-body">

                {/* Hero summary card */}
                <div className="home-mock-hero-card">
                  <div className="home-mock-hero-left">
                    <span className="home-mock-eyebrow">Sunday catch-up</span>
                    <div className="home-mock-live-row">
                      <span className="home-mock-live-dot" />
                      <span className="home-mock-live-label">Active now</span>
                    </div>
                    <span className="home-mock-time">Sun 3:00 – 4:00 PM · EST</span>
                  </div>
                  <a className="home-mock-join-btn">Join live call →</a>
                </div>

                {/* Participants */}
                <div className="home-mock-section-label">Family members on this call</div>
                <div className="home-mock-participants">
                  <div className="home-mock-participant">
                    <div className="home-mock-avatar home-mock-avatar-sm home-mock-av-1">MR</div>
                    <div className="home-mock-pinfo">
                      <span className="home-mock-pname">Mom Rose</span>
                      <span className="home-mock-pmeta">Mother · Joined</span>
                    </div>
                    <span className="home-mock-badge home-mock-badge-present">Present</span>
                  </div>
                  <div className="home-mock-participant">
                    <div className="home-mock-avatar home-mock-avatar-sm home-mock-av-2">GJ</div>
                    <div className="home-mock-pinfo">
                      <span className="home-mock-pname">Grandpa Joe</span>
                      <span className="home-mock-pmeta">Grandfather · Joined</span>
                    </div>
                    <span className="home-mock-badge home-mock-badge-present">Present</span>
                  </div>
                  <div className="home-mock-participant">
                    <div className="home-mock-avatar home-mock-avatar-sm home-mock-av-you">You</div>
                    <div className="home-mock-pinfo">
                      <span className="home-mock-pname">You</span>
                      <span className="home-mock-pmeta">Scheduled to join</span>
                    </div>
                    <span className="home-mock-badge">Invited</span>
                  </div>
                  <div className="home-mock-participant">
                    <div className="home-mock-avatar home-mock-avatar-sm home-mock-av-3">LK</div>
                    <div className="home-mock-pinfo">
                      <span className="home-mock-pname">Lia K.</span>
                      <span className="home-mock-pmeta">Sister · Scheduled</span>
                    </div>
                    <span className="home-mock-badge">Invited</span>
                  </div>
                </div>

                {/* Footer stat */}
                <div className="home-mock-footer-stat">
                  <span className="home-mock-live-dot" />
                  Kynfowk found this window · via Zoom · 4 members scheduled
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ───────────────────────────────────────── */}
        <div className="home-trust-strip container">
          <span>✦ Works with Zoom, Meet &amp; FaceTime</span>
          <span>✦ Schedules itself around everyone</span>
          <span>✦ No ads, no noise</span>
          <span>✦ Private by design</span>
        </div>

        {/* ── Family photo reel ─────────────────────────────────── */}
        {carouselPhotos.length > 0 && (
          <section className="home-section container home-carousel-section">
            <div className="home-section-label">Family reel</div>
            <h2 className="home-section-title">Your circle, in pictures.</h2>
            <FamilyPhotoCarousel photos={carouselPhotos} />
          </section>
        )}

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="home-section container">
          <div className="home-section-label">How it works</div>
          <h2 className="home-section-title">
            From scattered schedules to a video call everyone can make.
          </h2>
          <div className="home-steps">
            <div className="home-step">
              <div className="home-step-num">01</div>
              <div className="home-step-body">
                <h3>Create your Family Circle</h3>
                <p>Invite parents, siblings, cousins — whoever belongs. One shared space, one shared calendar.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">02</div>
              <div className="home-step-body">
                <h3>Everyone shares when they&apos;re free</h3>
                <p>Each member marks their preferred hours once. No polls, no group chats, no chasing replies.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">03</div>
              <div className="home-step-body">
                <h3>Kynfowk finds the window</h3>
                <p>The app surfaces the best times where everyone can actually show up and books the video call.</p>
              </div>
            </div>
            <div className="home-step-connector" aria-hidden />
            <div className="home-step">
              <div className="home-step-num">04</div>
              <div className="home-step-body">
                <h3>Show up and connect</h3>
                <p>Get a join link, hop on your video call, and let Kynfowk track the time you spent together.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="home-section container">
          <div className="home-section-label">What you get</div>
          <h2 className="home-section-title">Everything a family needs. Nothing it doesn&apos;t.</h2>
          <div className="home-features">
            <div className="home-feature-card">
              <div className="home-feature-icon">🎥</div>
              <h3>Video call scheduling</h3>
              <p>Kynfowk finds the window where everyone can show up, books the call, and sends you a join link — all automatically.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📅</div>
              <h3>Overlap-based availability</h3>
              <p>Each member sets their free hours once. Kynfowk matches across the whole circle and surfaces the strongest shared windows.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📊</div>
              <h3>Time Together tracking</h3>
              <p>Every completed video call logs to your family&apos;s Connections counter. See who joined, how long you talked, and keep the momentum.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📝</div>
              <h3>Post-call recaps</h3>
              <p>Capture a highlight and next step right after each video call while the memory is fresh. Build a living history of your family&apos;s story.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">🔔</div>
              <h3>Smart reminders</h3>
              <p>Gentle nudges 24 hours and 15 minutes before your video call. No spam — just the right reminder at the right time.</p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">📱</div>
              <h3>Works on any device</h3>
              <p>Browser, phone, or tablet — join your family video call wherever you are. Add Kynfowk to your home screen for one-tap access.</p>
            </div>
          </div>
        </section>

        {/* ── Case studies teaser ───────────────────────────────── */}
        <section className="home-section container">
          <div className="home-section-label">Real families</div>
          <h2 className="home-section-title">
            Stories from circles that made the habit stick.
          </h2>
          <div className="home-stories-row">
            <div className="home-story-preview">
              <span className="home-story-num">01</span>
              <p className="home-story-quote">&ldquo;She talks about her streak the way she talks about her garden — something she tends to.&rdquo;</p>
              <p className="home-story-label">Grandparent connection · 4 time zones</p>
            </div>
            <div className="home-story-preview">
              <span className="home-story-num">02</span>
              <p className="home-story-quote">&ldquo;The app never made it feel complicated — it just told us when to show up.&rdquo;</p>
              <p className="home-story-label">Long-distance siblings · 3 continents</p>
            </div>
            <div className="home-story-preview">
              <span className="home-story-num">05</span>
              <p className="home-story-quote">&ldquo;Having a call on the calendar was the difference between dread and anticipation.&rdquo;</p>
              <p className="home-story-label">Military deployment · 9 months, 31 calls</p>
            </div>
          </div>
          <div className="home-stories-link">
            <Link className="button button-ghost" href="/case-studies">
              Read all five stories →
            </Link>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="home-cta-section container">
          <div className="home-cta-card">
            <span className="eyebrow">Ready to reconnect?</span>
            <h2>Your family&apos;s next call is closer than you think.</h2>
            <p>Set up your Family Circle in under two minutes. No credit card. No commitment.</p>
            {hasCircle ? (
              <Link className="button home-cta-big" href="/dashboard">
                Back to your Family Circle →
              </Link>
            ) : isSignedIn ? (
              <Link className="button home-cta-big" href="/onboarding">
                Finish setting up your Family Circle
              </Link>
            ) : (
              <Link className="button home-cta-big" href="/auth/sign-up">
                Start your Family Circle — it&apos;s free
              </Link>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
