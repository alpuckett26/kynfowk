import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";
import { EditMemberForm, type EditableMember } from "./EditMemberForm";

export const metadata: Metadata = {
  title: "Edit member",
  description: "Update a family member's details.",
};

export default async function EditMemberPage({
  params,
}: {
  params: { memberId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <>
        <TopNav width="narrow">
          <Link
            href="/family"
            className="text-gray-500 transition-colors hover:text-gray-800"
          >
            ← Family
          </Link>
        </TopNav>
        <main className="min-h-screen bg-gray-50 py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-600">Sign in to edit family members.</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Sign in
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { data } = await supabase
    .from("family_members")
    .select("id, display_name, email, phone, is_elder, user_id")
    .eq("id", params.memberId)
    .maybeSingle();

  if (!data) notFound();

  const member: EditableMember = {
    id: data.id,
    display_name: data.display_name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    is_elder: data.is_elder,
    claimed: !!data.user_id,
  };

  return (
    <>
      <TopNav width="narrow">
        <Link
          href="/family"
          className="text-gray-500 transition-colors hover:text-gray-800"
        >
          ← Family
        </Link>
      </TopNav>

      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {member.display_name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {member.claimed
                ? "Active family member."
                : "Invited — they haven't signed in yet."}
            </p>
          </div>

          <EditMemberForm member={member} />
        </div>
      </main>
    </>
  );
}
