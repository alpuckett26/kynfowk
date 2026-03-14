import Link from "next/link";

import { Card } from "@/components/card";
import { SectionHeading } from "@/components/section-heading";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="container hero">
        <div className="hero-copy stack-md">
          <span className="eyebrow">Family-centered coordination</span>
          <h1>Make Time Together easier to keep.</h1>
          <p className="lede">
            Kynfowk helps families create a Family Circle, share real-life availability,
            and coordinate calls around overlap instead of endless back-and-forth.
          </p>

          <div className="hero-cta">
            <Link className="button" href="/auth/sign-up">
              Start your Family Circle
            </Link>
            <Link className="button button-secondary" href="/case-studies">
              Explore case studies
            </Link>
          </div>

          <div className="pill-row">
            <span className="pill">Family Connections</span>
            <span className="pill">Moments Shared</span>
            <span className="pill">Reconnection Streak</span>
            <span className="pill">Warm, low-friction UX</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="mock-stack">
            <div className="mock-panel">
              <p className="meta">This week</p>
              <p className="mock-number">3</p>
              <p>Upcoming family calls surfaced from overlapping availability.</p>
            </div>
            <div className="mock-panel alt">
              <p className="meta">Connections counter</p>
              <p className="mock-number">142 min</p>
              <p>Total Time Together this month across grandparents, siblings, and cousins.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container stack-lg">
        <SectionHeading
          eyebrow="How it works"
          title="A simple path from good intentions to shared time"
          description="The MVP keeps the flow tight: invite the family, capture availability, review the best overlap, and turn it into a call everyone can see."
        />

        <div className="feature-grid">
          <Card>
            <h3>Create your Family Circle</h3>
            <p>Set up one shared home for invites, availability, and upcoming calls.</p>
          </Card>
          <Card>
            <h3>Collect real availability</h3>
            <p>Gather preferred time windows instead of chasing a dozen text replies.</p>
          </Card>
          <Card>
            <h3>Coordinate with confidence</h3>
            <p>Use overlap-based suggestions and track Family Connections over time.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}
