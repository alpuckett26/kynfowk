import Link from "next/link";

import { Card } from "@/components/card";
import { SectionHeading } from "@/components/section-heading";
import { CASE_STUDIES } from "@/lib/constants";

export default function CaseStudiesPage() {
  return (
    <main className="page-shell">
      <section className="container stack-lg">
        <SectionHeading
          eyebrow="Real families. Real rhythms."
          title="What happens when good intentions become reliable habits."
          description="Five families. Five different challenges. One shared outcome: calls that actually happen, and connections that grow over time."
        />

        <div className="case-study-highlights">
          <div className="case-study-highlight-item">
            <p className="stat-value">31</p>
            <p className="stat-label">Calls kept during a 9-month deployment</p>
          </div>
          <div className="case-study-highlight-item">
            <p className="stat-value">148</p>
            <p className="stat-label">Peak Connection Score earned</p>
          </div>
          <div className="case-study-highlight-item">
            <p className="stat-value">37 wks</p>
            <p className="stat-label">Longest Reconnection Streak</p>
          </div>
          <div className="case-study-highlight-item">
            <p className="stat-value">3</p>
            <p className="stat-label">Continents bridged by one sibling circle</p>
          </div>
        </div>

        <div className="story-grid">
          {CASE_STUDIES.map((story, index) => (
            <Card key={story.title} className="story-card">
              <div className="stack-md">
                <div className="story-card-header">
                  <span className="story-card-number">0{index + 1}</span>
                  <span className="eyebrow">{story.family}</span>
                </div>
                <h2 className="story-card-title">{story.title}</h2>
                <p className="story-card-summary">{story.summary}</p>

                <div className="story-block">
                  <strong>The challenge</strong>
                  <p>{story.challenge}</p>
                </div>
                <div className="story-block">
                  <strong>How Kynfowk helped</strong>
                  <p>{story.approach}</p>
                </div>
                <div className="story-block">
                  <strong>What happened</strong>
                  <p>{story.result}</p>
                </div>

                <div className="metric-row">
                  {story.metrics.map((metric) => (
                    <span className="pill" key={metric}>
                      {metric}
                    </span>
                  ))}
                </div>

                <blockquote className="story-quote">&ldquo;{story.quote}&rdquo;</blockquote>

                <p className="story-highlight meta">{story.highlight}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="case-study-cta">
          <h2>Your family&apos;s story starts with one scheduled call.</h2>
          <p className="lede">
            Set up your Family Circle in under two minutes. No credit card. No commitment.
          </p>
          <div className="home-cta-row">
            <Link className="button home-cta-primary" href="/auth/sign-up">
              Start your Family Circle
            </Link>
            <Link className="button button-ghost home-cta-secondary" href="/">
              Learn how it works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
