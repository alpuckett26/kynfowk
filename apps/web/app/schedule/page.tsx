import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { ScheduleForm } from "./ScheduleForm";
import { getCurrentFamily } from "@/lib/connections";

export const metadata: Metadata = {
  title: "Schedule a Call",
  description: "Schedule a family call. Pick a time and we'll round up everyone.",
};

export default async function SchedulePage() {
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
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
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
            <ScheduleForm />
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
