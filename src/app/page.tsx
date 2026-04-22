import { Container } from "@/components/ui/container";

const problems = [
  "Your resume sounds generic and does not reflect the exact job description.",
  "Key ATS keywords are missing, so your profile gets filtered before a recruiter sees it.",
  "Achievements are buried under vague bullet points instead of measurable impact.",
  "The formatting looks cluttered on mobile and desktop, which reduces trust instantly."
];

const steps = [
  {
    title: "Paste JD",
    description: "Drop in the job description for the role you want to target."
  },
  {
    title: "Improve",
    description: "InterviewBoost rewrites your resume with sharper bullets, stronger keywords, and recruiter-friendly phrasing."
  },
  {
    title: "Download",
    description: "Export a cleaner, tailored resume that is ready to send in minutes."
  }
];

const pricing = [
  {
    name: "Free",
    price: "₹0",
    description: "Perfect for trying the workflow before you commit.",
    features: [
      "1 resume optimization",
      "Basic ATS keyword suggestions",
      "Preview before download"
    ],
    cta: "Start Free",
    featured: false
  },
  {
    name: "Pro",
    price: "₹299",
    description: "For serious job seekers who want more shortlisted applications.",
    features: [
      "Unlimited resume improvements",
      "Stronger job-specific bullet rewrites",
      "Download polished final resume",
      "Priority support"
    ],
    cta: "Get Pro",
    featured: true
  }
];

export default function Home() {
  return (
    <main className="min-h-screen py-6 sm:py-8">
      <Container>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
          <section className="relative border-b border-white/10 px-6 pb-16 pt-6 sm:px-10 sm:pb-20 lg:px-14 lg:pt-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-lg font-bold text-stone-950">
                  R
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">interviewboost</p>
                  <p className="text-sm text-stone-400">Resume optimization for India</p>
                </div>
              </div>
              <a
                href="#pricing"
                className="hidden rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-stone-200 transition hover:border-amber-300/40 hover:text-white sm:inline-flex"
              >
                See pricing
              </a>
            </div>

            <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200">
                  Tailor every application in under 2 minutes
                </span>
                <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
                  Get your resume shortlisted in India in 2 minutes
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300 sm:text-lg">
                  Stop sending the same resume everywhere. Match the job description,
                  surface the right keywords, and turn weak bullet points into strong
                  proof of impact before you apply.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#pricing"
                    className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-3 text-base font-semibold text-stone-950 transition hover:bg-amber-200"
                  >
                    Optimize My Resume
                  </a>
                  <a
                    href="#before-after"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-base font-medium text-stone-100 transition hover:border-white/30 hover:bg-white/5"
                  >
                    See Before vs After
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-stone-400">
                  <span className="rounded-full border border-white/10 px-4 py-2">ATS-friendly edits</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Built for Indian job seekers</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Instant export</span>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-stone-900/80 p-5 shadow-xl shadow-black/30">
                <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-stone-800 to-stone-900 p-5">
                  <div className="flex items-center justify-between text-sm text-stone-400">
                    <span>Resume match preview</span>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                      +41% stronger
                    </span>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Before</p>
                      <p className="mt-2 text-sm leading-7 text-stone-300">
                        Worked on sales reporting and helped the team with client tasks.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-amber-200">After</p>
                      <p className="mt-2 text-sm leading-7 text-white">
                        Built weekly sales dashboards and streamlined client reporting,
                        helping account managers respond faster and improve decision-making.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-semibold text-white">2 min</p>
                        <p className="mt-1 text-sm text-stone-400">Average turnaround</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-semibold text-white">ATS</p>
                        <p className="mt-1 text-sm text-stone-400">Keyword optimization</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-semibold text-white">PDF</p>
                        <p className="mt-1 text-sm text-stone-400">Download ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 py-16 sm:px-10 lg:px-14">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200">
                  Problem
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  Good candidates often get ignored for fixable resume reasons
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-stone-300">
                  Recruiters move quickly. If your resume looks broad, weak, or
                  mismatched to the role, you lose attention before the interview stage.
                </p>
              </div>
              <div className="grid gap-4">
                {problems.map((problem) => (
                  <div
                    key={problem}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-stone-200"
                  >
                    <div className="flex gap-4">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <p className="text-base leading-7 text-stone-300">{problem}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-y border-white/10 bg-black/10 px-6 py-16 sm:px-10 lg:px-14">
            <div className="mx-auto max-w-5xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200">
                Solution
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                A simple 3-step flow that gets you application-ready fast
              </h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[1.75rem] border border-white/10 bg-stone-900/60 p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-lg font-bold text-stone-950">
                    {index + 1}
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-base leading-8 text-stone-300">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="before-after"
            className="px-6 py-16 sm:px-10 lg:px-14"
          >
            <div className="flex max-w-3xl flex-col gap-4">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200">
                Before vs After
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Small wording changes can make your resume feel ten times sharper
              </h2>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-rose-400/15 bg-rose-300/5 p-6">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-200">
                  Before
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-white">Too vague</h3>
                <ul className="mt-6 space-y-4 text-base leading-8 text-stone-300">
                  <li>Responsible for handling marketing activities.</li>
                  <li>Worked with different teams on campaigns.</li>
                  <li>Helped improve social media engagement.</li>
                </ul>
              </div>
              <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-300/5 p-6">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-200">
                  After
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-white">Clear and relevant</h3>
                <ul className="mt-6 space-y-4 text-base leading-8 text-stone-200">
                  <li>Executed multi-channel marketing campaigns aligned to quarterly growth goals.</li>
                  <li>Partnered with sales and design teams to launch faster, better-targeted campaigns.</li>
                  <li>Improved social engagement with stronger content planning and performance-led iterations.</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            id="pricing"
            className="border-y border-white/10 bg-white/5 px-6 py-16 sm:px-10 lg:px-14"
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200">
                Pricing
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Start free, then upgrade when you are ready to apply at scale
              </h2>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {pricing.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-[1.75rem] border p-7 ${
                    plan.featured
                      ? "border-amber-300/30 bg-amber-300/10 shadow-xl shadow-amber-950/10"
                      : "border-white/10 bg-stone-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{plan.name}</p>
                      <p className="mt-2 text-sm leading-7 text-stone-300">{plan.description}</p>
                    </div>
                    {plan.featured ? (
                      <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-semibold text-stone-950">
                        Most Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-white">
                    {plan.price}
                  </p>
                  <ul className="mt-8 space-y-3 text-base text-stone-200">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#final-cta"
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition ${
                      plan.featured
                        ? "bg-amber-300 text-stone-950 hover:bg-amber-200"
                        : "border border-white/10 text-white hover:bg-white/5"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section
            id="final-cta"
            className="px-6 py-16 sm:px-10 lg:px-14"
          >
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-amber-300 to-yellow-200 p-8 text-stone-950 sm:p-10 lg:p-12">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-700">
                  Final CTA
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                  Your next interview might depend on a better resume, not better luck
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
                  Make your experience easier to understand, easier to trust, and easier to shortlist.
                  Start with the free version and upgrade to Pro for just ₹299 when you need more.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#pricing"
                    className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-800"
                  >
                    Start Free Now
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center justify-center rounded-full border border-stone-900/10 px-6 py-3 text-base font-semibold text-stone-900 transition hover:bg-white/30"
                  >
                    Upgrade to Pro
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
