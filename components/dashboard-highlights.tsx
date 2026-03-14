import { Card } from "@/components/card";
import type { DashboardHighlight } from "@/lib/types";

export function DashboardHighlights({
  highlights
}: {
  highlights: DashboardHighlight[];
}) {
  return (
    <div className="highlights-grid">
      {highlights.map((highlight) => (
        <Card
          className={`highlight-card ${
            highlight.tone === "success"
              ? "highlight-success"
              : highlight.tone === "warm"
                ? "highlight-warm"
                : ""
          }`}
          key={highlight.title}
        >
          <p className="stat-label">{highlight.title}</p>
          <p className="highlight-value">{highlight.value}</p>
          <p className="meta">{highlight.detail}</p>
        </Card>
      ))}
    </div>
  );
}
