import Link from "next/link";

import { Card } from "@/components/card";
import { FeedbackForm } from "@/components/feedback-form";
import { getViewerFamilyCircle, requireViewer } from "@/lib/data";

export default async function FeedbackPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; callId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const family = await getViewerFamilyCircle(user.id);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <header>
          <h1>Feedback</h1>
          <p className="meta">
            Page: {params?.page ?? "/feedback"}
            {params?.callId ? ` · Call ${params.callId}` : ""}
          </p>
        </header>

        <Card>
          <div className="stack-md">
            <h2>Share pilot feedback</h2>
            <FeedbackForm
              callSessionId={params?.callId ?? null}
              familyCircleId={family?.circle.id ?? null}
              pagePath={params?.page ?? "/feedback"}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
