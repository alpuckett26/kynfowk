import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { ScheduleForm, type SelectableMember } from "./ScheduleForm";
import { getCurrentFamily } from "@/lib/connections";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Schedule a Call",
  description: "Schedule a family call. Pick a time and who's coming.",
};

async function loadFamilyMembers(): Promise<{
  members: SelectableMember[];
  selfMemberId: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [], selfMemberId: null };

  const { data } = await supabase
    .from("family_members")
    .select("id, display_name, is_elder, user_id")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as {
    id: string;
    display_name: string;
    is_elder: boolean;
    user_id: string | null;
  }[];

  return {
    members: rows.map((r) => ({
      id: r.id,
      display_name: r.display_name,
      is_elder: r.is_elder,
    })),
    selfMemberId: rows.find((r) => r.user_id === user.id)?.id ?? null,
  };
}

export default async function SchedulePage() {
  const family = await getCurrentFamily();
  const { members, selfMemberId } = family.signedIn
    ? await loadFamilyMembers()
    : { members: [], selfMemberId: null };

  return (
    <>
      <TopNav width="narrow">
        <Link
          href="/dashboard"
          className="text-gray-500 transition-colors hover:text-gray-800"
        >
          ← Dashboard
        </Link>
      </TopNav>
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Schedule a call
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {family.signedIn
                ? `For the ${family.name} family.`
                : "Sign in first to schedule a real call."}
            </p>
          </div>

          {family.signedIn ? (
            <ScheduleForm members={members} selfMemberId={selfMemberId} />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-600">
                You need to sign in before scheduling a call.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
