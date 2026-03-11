import { caseStudies } from "@/data/case-studies";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function CaseStudiesSection() {
  return (
    <section
      id="case-studies"
      className="py-24 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="case-studies-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Real Families"
          title="Stories of Connection"
          description="Every family has a reason they came to Kynfowk. Here are five that remind us why staying connected matters."
          id="case-studies-heading"
        />

        {/* Stats bar */}
        <div className="mt-12 mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
          {[
            { value: "94%", label: "kept their streak for 4+ weeks" },
            { value: "3×", label: "more calls vs. before Kynfowk" },
            { value: "400+", label: "minutes shared on avg per month" },
            { value: "100%", label: "said it strengthened their bond" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-brand-600">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-6">
            Ready to write your family&apos;s story?
          </p>
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-8 py-3.5 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Start for free
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
