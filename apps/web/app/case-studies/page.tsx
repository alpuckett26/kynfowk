import type { Metadata } from "next";
import Link from "next/link";
import { caseStudies } from "@/data/case-studies";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Family Stories",
  description:
    "Real families. Real connections. See how Kynfowk has helped families stay close across every distance.",
};

function StatsBar() {
  return (
    <div className="bg-gradient-to-r from-brand-500 to-purple-600 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
          {[
            { value: "2,400+", label: "families connected" },
            { value: "84k+", label: "moments shared" },
            { value: "3.2×", label: "more calls after joining" },
            { value: "94%", label: "maintained 4-week streak" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums">
                {s.value}
              </p>
              <p className="mt-1 text-brand-200 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CaseStudiesPage() {
  return (
    <>
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-xl">💜</span>
            <span>Kynfowk</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-brand-50 to-white text-center px-4">
          <SectionHeader
            eyebrow="Real Families"
            title="Stories of Connection"
            description="Every family has their own distance to bridge. Here are five that remind us why staying close matters — and how Kynfowk helped them do it."
          />
        </section>

        {/* Stats bar */}
        <StatsBar />

        {/* Cards */}
        <section className="py-20 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {caseStudies.map((study) => (
                <CaseStudyCard key={study.id} study={study} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start your family&apos;s story
          </h2>
          <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
            Thousands of families are already building their connection legacy
            with Kynfowk. Yours could be next.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#get-started"
              className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Get started for free →
            </a>
            <Link
              href="/dashboard"
              className="rounded-full border border-gray-300 px-8 py-4 text-gray-700 font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              See the dashboard
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-10 text-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Kynfowk. Built with love for
          families everywhere.
        </p>
      </footer>
    </>
  );
}
