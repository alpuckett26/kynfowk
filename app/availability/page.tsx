import { redirect } from "next/navigation";

// M50 — availability moved into the Plan panel inside /dashboard.
// Permanent redirect for any in-the-wild links.
export default function AvailabilityPage() {
  redirect("/dashboard#plan");
}
