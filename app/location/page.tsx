import Link from "next/link";

import { LocationSharingPanel } from "@/components/location-sharing-panel";
import { requireViewer } from "@/lib/data";

export default async function LocationPage() {
  await requireViewer();
  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <header className="stack-sm">
          <p className="eyebrow">Immediate family</p>
          <h1>Share where you are</h1>
          <p className="meta">A private, temporary check-in for the people closest to you.</p>
          <div><Link className="text-link" href="/dashboard">← Back to your circle</Link></div>
        </header>
        <LocationSharingPanel />
      </div>
    </main>
  );
}
