import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamily } from "@/lib/connections";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = {
  title: "Family",
  description: "Your Kynfowk family — view members and invite new ones.",
};

type Member = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  is_elder: boolean;
  user_id: string | null;
};

async function getMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("family_members")
    .select("id, display_name, email, phone, is_elder, user_id")
    .order("created_at", { ascending: true });
  return (data ?? []) as Member[];
}

export default async function FamilyPage() {
  const family = await getCurrentFamily();

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
        <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {family.name} Family
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {family.signedIn
                ? "Manage who's in your family and invite new members."
                : "Sign in to manage your family."}
            </p>
          </div>

          {family.signedIn ? (
            <>
              <MemberList />
              <InviteForm />
            </>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-600">
                You need to sign in to view and manage your family.
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

async function MemberList() {
  const members = await getMembers();

  return (
    <section aria-labelledby="members-heading" className="space-y-3">
      <h2
        id="members-heading"
        className="text-base font-semibold text-gray-900"
      >
        Members
      </h2>
      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No members yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {m.display_name}
                  </p>
                  {m.is_elder && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Elder
                    </span>
                  )}
                  {!m.user_id && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Invited
                    </span>
                  )}
                </div>
                {m.email && (
                  <p className="truncate text-xs text-gray-500">{m.email}</p>
                )}
                {m.phone && (
                  <p className="truncate text-xs text-gray-400">{m.phone}</p>
                )}
              </div>
              <Link
                href={`/family/${m.id}/edit`}
                className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
