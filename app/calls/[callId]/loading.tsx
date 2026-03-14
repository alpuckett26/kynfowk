import { Card } from "@/components/card";

export default function CallDetailLoading() {
  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <div className="dashboard-hero">
          <div className="stack-md">
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
          </div>
          <Card>
            <div className="stack-md">
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-value" />
              <div className="skeleton skeleton-copy" />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
