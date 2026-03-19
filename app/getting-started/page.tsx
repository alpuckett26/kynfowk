import Link from "next/link";

import { Card } from "@/components/card";
import { requireViewer } from "@/lib/data";

const STEPS = [
  {
    title: "Invite your family",
    body: "Open Family management and make sure each person who should join your circle has an invite waiting.",
    href: "/family",
    cta: "Manage family"
  },
  {
    title: "Set availability",
    body: "Ask each active family member to share the windows they can usually keep, so Kynfowk can spot real overlap.",
    href: "/availability",
    cta: "Set availability"
  },
  {
    title: "Schedule a call",
    body: "Use the dashboard’s best times to connect to protect a realistic family-ready window.",
    href: "/dashboard",
    cta: "Open dashboard"
  },
  {
    title: "Join your call",
    body: "Once the call is on the calendar, open the call detail page and tap \"Join live call\" — Kynfowk's built-in video room is ready for your whole circle.",
    href: "/calls",
    cta: "View scheduled calls"
  },
  {
    title: "Enable reminders and install the app",
    body: "Visit Settings or Notifications to enable reminders, then add Kynfowk to your home screen if your browser offers it.",
    href: "/settings",
    cta: "Open settings"
  }
];

export default async function GettingStartedPage() {
  await requireViewer();

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">Pilot guide</span>
            <h1>Getting started with your Family Circle.</h1>
            <p className="lede">
              Kynfowk works best when the early setup feels calm. These five steps cover the
              whole pilot path from invites to reminders.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Pilot checklist</p>
            <p className="highlight-value">5 gentle steps</p>
            <p className="meta">
              You do not need to set everything up at once. Start with invites and availability,
              then protect the first family call.
            </p>
          </Card>
        </section>

        <section className="panel-grid">
          {STEPS.map((step, index) => (
            <Card key={step.title}>
              <div className="stack-md">
                <span className="eyebrow">Step {index + 1}</span>
                <h2>{step.title}</h2>
                <p className="meta">{step.body}</p>
                <a className="button button-secondary" href={step.href}>
                  {step.cta}
                </a>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
