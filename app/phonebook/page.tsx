import Link from "next/link";

import { Card } from "@/components/card";
import { PhonebookEntry } from "@/components/phonebook-entry";
import { StatusBanner } from "@/components/status-banner";
import { getPhonebookData, requireViewer } from "@/lib/data";

export default async function PhonebookPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const data = await getPhonebookData(user.id);

  const withContact = data.members.filter((m) => m.phone_number || m.address);
  const withoutContact = data.members.filter((m) => !m.phone_number && !m.address);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <StatusBanner code={params?.status} />

        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Family Phonebook</h1>
            <p className="lede">
              Everyone in one place — phone numbers, addresses, and a quick way to reach out
              before or after a call.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Contact snapshot</p>
            <p className="highlight-value">{withContact.length} of {data.members.length}</p>
            <p className="meta">
              family member{withContact.length === 1 ? "" : "s"} have contact info saved.
              {withoutContact.length > 0
                ? ` ${withoutContact.length} still need${withoutContact.length === 1 ? "s" : ""} info added.`
                : " Your circle is fully connected."}
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </Card>
        </section>

        <Card className="soft-callout">
          <div className="stack-sm">
            <p className="meta">
              <strong>Privacy notice:</strong> Contact info you share here is only visible to
              members of your Family Circle. It is used to make it easier to reach each other
              outside of scheduled calls — never shared with third parties or used for
              advertising.
            </p>
          </div>
        </Card>

        <Card>
          <div className="stack-md">
            <h2>Family contacts</h2>
            <div className="phonebook-list">
              {data.members.map((member) => (
                <PhonebookEntry
                  key={member.id}
                  member={member}
                  viewerMembershipId={data.viewerMembershipId}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
