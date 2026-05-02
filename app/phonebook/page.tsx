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

        <header>
          <h1>Phonebook</h1>
          <p className="meta">{withContact.length} of {data.members.length} have contact info</p>
        </header>

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
