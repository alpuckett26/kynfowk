import { Card } from "@/components/card";
import { SectionHeading } from "@/components/section-heading";
import { CASE_STUDIES } from "@/lib/constants";

export default function CaseStudiesPage() {
  return (
    <main className="page-shell">
      <section className="container stack-lg">
        <SectionHeading
          eyebrow="Case studies"
          title="Investor-demo storytelling for how families actually reconnect"
          description="These examples show what Kynfowk looks like when it turns family logistics into a warm, repeatable habit. Each one frames the problem, the product behavior, and the outcome."
        />

        <div className="highlights-grid">
          <Card className="highlight-card highlight-warm">
            <p className="stat-label">Demo story angle</p>
            <p className="highlight-value">Coordination becomes care</p>
            <p className="meta">
              Kynfowk turns availability overlap into moments families can actually keep.
            </p>
          </Card>
          <Card className="highlight-card highlight-success">
            <p className="stat-label">Product proof</p>
            <p className="highlight-value">Calls, minutes, streaks</p>
            <p className="meta">
              The dashboard gives clear evidence that Family Connections are happening.
            </p>
          </Card>
          <Card className="highlight-card">
            <p className="stat-label">Why it matters</p>
            <p className="highlight-value">Low-friction family ritual</p>
            <p className="meta">
              The product succeeds when it feels emotionally intelligent, not operational.
            </p>
          </Card>
        </div>

        <div className="story-grid">
          {CASE_STUDIES.map((story) => (
            <Card key={story.title}>
              <div className="stack-md">
                <span className="eyebrow">{story.family}</span>
                <h2>{story.title}</h2>
                <p>{story.summary}</p>
                <div className="story-block">
                  <strong>Challenge</strong>
                  <p>{story.challenge}</p>
                </div>
                <div className="story-block">
                  <strong>How Kynfowk helped</strong>
                  <p>{story.approach}</p>
                </div>
                <div className="story-block">
                  <strong>Result</strong>
                  <p>{story.result}</p>
                </div>
                <div className="metric-row">
                  {story.metrics.map((metric) => (
                    <span className="pill" key={metric}>
                      {metric}
                    </span>
                  ))}
                </div>
                <blockquote className="story-quote">“{story.quote}”</blockquote>
                <p className="meta">{story.highlight}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
