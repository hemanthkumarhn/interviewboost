import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/ui/logo-mark";

const problems = [
  "Your resume sounds generic, so recruiters cannot quickly connect you to the role.",
  "Important ATS keywords are missing, which means your application gets filtered early.",
  "Strong project work is buried under vague bullets instead of visible outcomes.",
  "The final PDF looks plain or cluttered, which reduces trust before anyone reads deeply."
];

const steps = [
  {
    title: "Upload or paste your resume",
    description: "Bring an existing resume or start from raw text in a clean, guided flow."
  },
  {
    title: "Match it to a real job",
    description: "Paste the job description and get safer, ATS-aware rewrites with clearer bullets."
  },
  {
    title: "Compare, score, and export",
    description: "Review before/after changes, see the ATS score, then download the polished version."
  }
];

const highlights = [
  "Resume upload support",
  "ATS score visibility",
  "Before vs after bullet diffs",
  "PDF export in minutes"
];

export default function Home() {
  return (
    <main className="min-h-screen py-6 sm:py-8">
      <Container>
        <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <section className="border-b border-[var(--color-border)] px-6 py-6 sm:px-10 lg:px-14">
            <div className="flex items-center justify-between gap-4">
              <LogoMark />
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  href="/resume"
                  className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-soft)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
                >
                  Open app
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <span className="inline-flex rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--color-brand)]">
                  Built for Indian job seekers
                </span>
                <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-5xl lg:text-7xl">
                  Get your resume shortlisted in India in 2 minutes
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-soft)] sm:text-lg">
                  InterviewBoost helps you tailor your resume to a real job description,
                  improve weak bullets without inventing experience, and export a cleaner
                  version that is easier for recruiters and ATS systems to understand.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/resume"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
                  >
                    Improve my resume
                  </Link>
                  <a
                    href="#proof"
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-6 py-3 text-base font-medium text-[var(--color-brand)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-soft)]"
                  >
                    View before vs after
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--color-text-soft)]">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
                <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                  <div className="flex items-center justify-between text-sm text-[var(--color-text-soft)]">
                    <span>Match preview</span>
                    <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 font-semibold text-[var(--color-accent)]">
                      ATS +41
                    </span>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-soft)]">
                        Before
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-text-soft)]">
                        Worked on multiple mobile apps and collaborated with the team to
                        handle project requirements.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                        After
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-text)]">
                        Built and delivered multiple iOS applications while partnering with
                        cross-functional teams to shape requirements and improve release quality.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <p className="text-2xl font-semibold text-[var(--color-brand)]">2 min</p>
                        <p className="mt-1 text-sm text-[var(--color-text-soft)]">Average turnaround</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <p className="text-2xl font-semibold text-[var(--color-brand)]">ATS</p>
                        <p className="mt-1 text-sm text-[var(--color-text-soft)]">Score visibility</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <p className="text-2xl font-semibold text-[var(--color-brand)]">PDF</p>
                        <p className="mt-1 text-sm text-[var(--color-text-soft)]">Export ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 py-16 sm:px-10 lg:px-14">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  Problem
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
                  Most good candidates are not rejected because of skill, but because of positioning
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-[var(--color-text-soft)]">
                  Recruiters move fast. If your resume is vague, under-optimized, or visually weak,
                  you lose momentum before the first interview round even starts.
                </p>
              </div>
              <div className="grid gap-4">
                {problems.map((problem) => (
                  <div
                    key={problem}
                    className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5"
                  >
                    <div className="flex gap-4">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                      <p className="text-base leading-7 text-[var(--color-text-soft)]">{problem}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="how-it-works"
            className="border-y border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-16 sm:px-10 lg:px-14"
          >
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
                A cleaner, faster path from raw resume to tailored application
              </h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-[var(--color-text)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base leading-8 text-[var(--color-text-soft)]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="proof" className="px-6 py-16 sm:px-10 lg:px-14">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Before vs after
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
                Show users exactly what changed, not just a final block of text
              </h2>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-text-soft)]">
                  Before
                </p>
                <ul className="mt-6 space-y-4 text-base leading-8 text-[var(--color-text-soft)]">
                  <li>Worked on multiple mobile applications from scratch.</li>
                  <li>Collaborated with different teams to solve project requirements.</li>
                  <li>Documented technical details for future reference.</li>
                </ul>
              </div>
              <div className="rounded-[1.75rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  After
                </p>
                <ul className="mt-6 space-y-4 text-base leading-8 text-[var(--color-text)]">
                  <li>Built multiple mobile applications from scratch across production teams and client workflows.</li>
                  <li>Partnered with cross-functional stakeholders to refine requirements and improve delivery quality.</li>
                  <li>Documented technical design decisions and development practices for future reuse.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="border-t border-[var(--color-border)] bg-white px-6 py-16 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-6 rounded-[2rem] bg-[var(--color-brand)] px-8 py-10 text-white lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
                  Final CTA
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Give recruiters a sharper, safer version of your resume
                </h2>
                <p className="mt-4 text-base leading-8 text-white/80">
                  Upload, compare, score, and export in one place. Start with your next job
                  description now.
                </p>
              </div>
              <Link
                href="/resume"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-[var(--color-brand)] transition hover:bg-slate-100"
              >
                Open InterviewBoost
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
