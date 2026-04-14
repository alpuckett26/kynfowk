import Link from "next/link";
import { CaseStudiesSection } from "@/components/CaseStudiesSection";
import { GetStartedForm } from "@/components/GetStartedForm";

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-2xl">💜</span>
          <span>Kynfowk</span>
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="#how-it-works" className="hover:text-gray-900 transition-colors">
            How it works
          </Link>
          <Link href="#case-studies" className="hover:text-gray-900 transition-colors">
            Stories
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-warm-50 pt-20 pb-32">
      {/* Decorative blobs */}
      <div
        className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-100 opacity-30 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-warm-100 opacity-30 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-8">
          <span>✨</span>
          <span>Now with Family Connection Scores</span>
        </div>

        <h1 className="text-balance text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
          Keep Your{" "}
          <span className="bg-gradient-to-r from-brand-500 to-purple-600 bg-clip-text text-transparent">
            Family Close
          </span>
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-gray-600 max-w-2xl mx-auto sm:text-xl">
          Kynfowk finds the perfect call windows for your whole family, tracks
          every moment shared, and celebrates your connection milestones —
          automatically.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#get-started"
            className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base"
          >
            Start for free →
          </a>
          <Link
            href="/dashboard"
            className="rounded-full border border-gray-300 px-8 py-4 text-gray-700 font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all text-base"
          >
            See a demo
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { n: "2,400+", label: "families connected" },
            { n: "84k+", label: "moments shared" },
            { n: "4.9/5", label: "family rating" },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-brand-600">{s.n}</span>
              <span className="text-sm text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: "📅",
      title: "Set your availability",
      desc: "Each family member adds their open windows once. Kynfowk finds the overlaps.",
    },
    {
      icon: "📞",
      title: "Call with one tap",
      desc: "A calendar hold lands in everyone's calendar. No chasing, no rescheduling.",
    },
    {
      icon: "💜",
      title: "Celebrate your connection",
      desc: "Every call earns Connection Score. Track streaks, moments shared, and time together.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 bg-white"
      aria-labelledby="hiw-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-600">
            Simple by design
          </p>
          <h2
            id="hiw-heading"
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Three steps to staying close
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="hidden sm:block absolute top-6 left-[calc(50%+3rem)] right-[calc(-50%+3rem)] h-px bg-gray-200"
                  aria-hidden
                />
              )}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl shadow-sm">
                  {s.icon}
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConnectionFeaturesSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-300">
              Connections Counter
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Measure what matters most
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              Every call earns your family a Connection Score. Track streaks,
              celebrate elder participation, and cheer every long-distance
              reconnection.
            </p>
            <ul className="space-y-4">
              {[
                {
                  icon: "📞",
                  text: "Completed calls",
                  score: "+1 each",
                },
                {
                  icon: "⏱️",
                  text: "Calls over 10 minutes",
                  score: "+1 bonus",
                },
                {
                  icon: "👥",
                  text: "3+ family members on one call",
                  score: "+1 bonus",
                },
                {
                  icon: "🎉",
                  text: "First call after 30+ days apart",
                  score: "+2 bonus",
                },
                {
                  icon: "🌻",
                  text: "Elder family member joins",
                  score: "+1 bonus",
                },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="text-xl w-8">{f.icon}</span>
                  <span className="flex-1 text-gray-200">{f.text}</span>
                  <span className="text-sm font-mono font-semibold text-brand-300 bg-white/10 rounded-full px-2.5 py-0.5">
                    {f.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock dashboard card */}
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400 mb-4">
              Henderson Family · This week
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Moments Shared", value: "12", icon: "📞" },
                { label: "Time Together", value: "2h 4m", icon: "⏱️" },
                { label: "People Connected", value: "4", icon: "👥" },
                { label: "Streak", value: "4w", icon: "🔥" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/10 p-3.5 text-center"
                >
                  <p className="text-xl mb-1">{s.icon}</p>
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-gradient-to-r from-brand-500/30 to-purple-600/30 border border-brand-500/30 p-3.5 text-center">
              <p className="text-xs text-brand-300 mb-1">
                Family Connection Score
              </p>
              <p className="text-4xl font-bold tabular-nums">28</p>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-purple-500"
                  style={{ width: "47%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">💜</span>
          <span>Kynfowk</span>
        </div>
        <p className="text-sm text-gray-500">
          Built with love for families everywhere. &copy;{" "}
          {new Date().getFullYear()} Kynfowk
        </p>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link href="/case-studies" className="hover:text-gray-700 transition-colors">
            Stories
          </Link>
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}

function GetStartedSection() {
  return (
    <section
      id="get-started"
      className="py-24 bg-gradient-to-br from-brand-50 to-warm-50"
    >
      <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-600">
          Get started
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
          Your family&apos;s connection story starts here
        </h2>
        <p className="text-lg text-gray-500 mb-8">
          Free to try. No credit card. Works on any device.
        </p>
        <GetStartedForm />
        <p className="mt-4 text-xs text-gray-400">
          Join 2,400+ families already connected with Kynfowk
        </p>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <ConnectionFeaturesSection />
        <CaseStudiesSection />
        <GetStartedSection />
      </main>
      <FooterSection />
    </>
  );
}
