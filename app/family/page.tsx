import { redirect } from "next/navigation";

// M50 — family management moved into the Family panel inside
// /dashboard. /family/tree and other sub-routes still exist.
export default function FamilyPage() {
  redirect("/dashboard#family");
}
