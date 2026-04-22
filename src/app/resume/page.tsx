"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { Container } from "@/components/ui/container";

type MatchResponse = {
  improvedText: string;
  addedKeywords: string[];
  improvementSummary: string[];
};

type JobEntry = {
  id: string;
  role: string;
  company: string;
  status: "Applied";
};

const JOBS_STORAGE_KEY = "interviewboost-applied-jobs";

export default function ResumePage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [showJobPrompt, setShowJobPrompt] = useState(false);
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<JobEntry[]>([]);

  useEffect(() => {
    const savedJobs = window.localStorage.getItem(JOBS_STORAGE_KEY);

    if (!savedJobs) {
      return;
    }

    try {
      const parsedJobs = JSON.parse(savedJobs) as JobEntry[];
      setAppliedJobs(parsedJobs);
    } catch {
      window.localStorage.removeItem(JOBS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(appliedJobs));
  }, [appliedJobs]);

  async function runImprovement(mode: "initial" | "refine") {
    setIsLoading(true);
    setMessage(null);
    setShowJobPrompt(false);

    if (mode === "initial") {
      setResult(null);
    }

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeText: resume,
          jobDescription,
          mode,
          priorImprovedText: mode === "refine" ? result?.improvedText ?? "" : ""
        })
      });

      const data = (await response.json()) as MatchResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setResult({
        improvedText: data.improvedText,
        addedKeywords: data.addedKeywords,
        improvementSummary: data.improvementSummary
      });
      setMessage(
        mode === "refine"
          ? "Resume refined into a more polished version."
          : "Resume improved successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to improve the resume right now."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImproveResume() {
    await runImprovement("initial");
  }

  async function handleImproveAgain() {
    await runImprovement("refine");
  }

  function handleApplyChanges() {
    if (!result) {
      return;
    }

    setResume(result.improvedText);
    setMessage("Improved text applied to your resume.");
  }

  function handleTryAnotherJobDescription() {
    setJobDescription("");
    setResult(null);
    setShowJobPrompt(false);
    setMessage("Paste another job description to generate a new version.");
  }

  function handleDownloadPdf() {
    if (!result) {
      return;
    }

    const doc = new jsPDF({
      format: "a4",
      unit: "pt"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addPageIfNeeded = (extraHeight = 0) => {
      if (y + extraHeight <= pageHeight - margin) {
        return;
      }

      doc.addPage();
      y = margin;

      if (plan === "free") {
        doc.saveGraphicsState();
        doc.setTextColor(225, 225, 225);
        doc.setFontSize(42);
        doc.text("Made with InterviewBoost", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 35
        });
        doc.restoreGraphicsState();
      }
    };

    const addWrappedBlock = (
      text: string,
      options: { fontSize?: number; color?: [number, number, number]; gapAfter?: number } = {}
    ) => {
      const fontSize = options.fontSize ?? 11;
      const gapAfter = options.gapAfter ?? 16;

      doc.setFontSize(fontSize);

      if (options.color) {
        doc.setTextColor(...options.color);
      } else {
        doc.setTextColor(30, 30, 30);
      }

      const lines = doc.splitTextToSize(text, maxWidth) as string[];

      lines.forEach((line) => {
        addPageIfNeeded(fontSize + 8);
        doc.text(line, margin, y);
        y += fontSize + 6;
      });

      y += gapAfter;
    };

    if (plan === "free") {
      doc.saveGraphicsState();
      doc.setTextColor(225, 225, 225);
      doc.setFontSize(42);
      doc.text("Made with InterviewBoost", pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 35
      });
      doc.restoreGraphicsState();
    }

    doc.setFont("helvetica", "bold");
    addWrappedBlock("Improved Resume", {
      fontSize: 20,
      color: [15, 23, 42],
      gapAfter: 10
    });

    doc.setFont("helvetica", "normal");
    addWrappedBlock("ATS-friendly export generated by InterviewBoost.", {
      fontSize: 10,
      color: [90, 90, 90],
      gapAfter: 20
    });

    doc.setFont("helvetica", "bold");
    addWrappedBlock("Resume Content", {
      fontSize: 13,
      color: [15, 23, 42],
      gapAfter: 10
    });

    doc.setFont("helvetica", "normal");
    result.improvedText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        addWrappedBlock(line, {
          fontSize: 11,
          color: [30, 30, 30],
          gapAfter: 8
        });
      });

    if (result.addedKeywords.length > 0) {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Keywords Added", {
        fontSize: 13,
        color: [15, 23, 42],
        gapAfter: 10
      });

      doc.setFont("helvetica", "normal");
      addWrappedBlock(result.addedKeywords.join(", "), {
        fontSize: 11,
        color: [30, 30, 30],
        gapAfter: 18
      });
    }

    if (result.improvementSummary.length > 0) {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Improvement Summary", {
        fontSize: 13,
        color: [15, 23, 42],
        gapAfter: 10
      });

      doc.setFont("helvetica", "normal");
      result.improvementSummary.forEach((item) => {
        addWrappedBlock(`- ${item}`, {
          fontSize: 11,
          color: [30, 30, 30],
          gapAfter: 8
        });
      });
    }

    doc.save("interviewboost-improved-resume.pdf");
    setShowJobPrompt(true);
    setMessage(
      plan === "free"
        ? "PDF downloaded with InterviewBoost watermark."
        : "PDF downloaded without watermark."
    );
  }

  function handleSaveAppliedJob() {
    if (!jobRole.trim() || !company.trim()) {
      setMessage("Please add both role and company before saving the job.");
      return;
    }

    const newJob: JobEntry = {
      id: `${Date.now()}`,
      role: jobRole.trim(),
      company: company.trim(),
      status: "Applied"
    };

    setAppliedJobs((currentJobs) => [newJob, ...currentJobs]);
    setJobRole("");
    setCompany("");
    setShowJobPrompt(false);
    setMessage("Job added to your tracker.");
  }

  return (
    <main className="min-h-screen py-10 sm:py-16">
      <Container>
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 lg:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200">
              Resume Optimizer
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              Improve your resume for a specific job
            </h1>
            <p className="mt-4 text-base leading-8 text-stone-300 sm:text-lg">
              Paste your current resume and the job description below, then let
              InterviewBoost prepare them for a stronger match.
            </p>
            <div className="mt-6 inline-flex rounded-full border border-white/10 bg-black/10 p-1">
              <button
                type="button"
                onClick={() => setPlan("free")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  plan === "free"
                    ? "bg-amber-300 text-stone-950"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setPlan("pro")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  plan === "pro"
                    ? "bg-amber-300 text-stone-950"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Pro
              </button>
            </div>
            <p className="mt-3 text-sm text-stone-400">
              Mock plan switch for PDF export. Free includes a watermark. Pro removes it.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-6">
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-stone-200">
                  Your resume
                </span>
                <textarea
                  value={resume}
                  onChange={(event) => setResume(event.target.value)}
                  placeholder="Paste your resume here..."
                  className="min-h-[220px] w-full rounded-[1.5rem] border border-white/10 bg-stone-950/70 px-5 py-4 text-base text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-stone-200">
                  Job description
                </span>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job description here..."
                  className="min-h-[220px] w-full rounded-[1.5rem] border border-white/10 bg-stone-950/70 px-5 py-4 text-base text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                />
              </label>

              <section className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Applied Jobs</h2>
                    <p className="mt-2 text-sm leading-7 text-stone-400">
                      Minimal tracker for jobs you already applied to.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                    Phase 0
                  </span>
                </div>

                {appliedJobs.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {appliedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-base font-semibold text-white">{job.role}</p>
                          <p className="mt-1 text-sm text-stone-400">{job.company}</p>
                        </div>
                        <span className="inline-flex w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-7 text-stone-400">
                    No jobs tracked yet. After you download the PDF, you can quickly save the role and company here.
                  </div>
                )}
              </section>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Result Preview</h2>
                  <p className="mt-2 text-sm leading-7 text-stone-400">
                    Review the improved version, keywords, and summary before applying changes.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                  AI Output
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleImproveResume}
                    disabled={isLoading || !resume.trim() || !jobDescription.trim()}
                    className="inline-flex min-w-[220px] items-center justify-center gap-3 rounded-full bg-amber-300 px-6 py-3 text-base font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950/30 border-t-stone-950" />
                        Improving Resume...
                      </>
                    ) : (
                      "Improve Resume"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyChanges}
                    disabled={!result || isLoading}
                    className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Apply changes
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleImproveAgain}
                    disabled={isLoading || !resume.trim() || !jobDescription.trim()}
                    className="inline-flex w-full items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 px-6 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Improve again
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={!result || isLoading}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Download PDF
                  </button>
                </div>

                {message ? <p className="text-sm text-stone-300">{message}</p> : null}

                {isLoading ? (
                  <div className="rounded-2xl border border-amber-300/10 bg-amber-300/5 px-4 py-4 text-sm text-amber-100">
                    Analyzing your resume, matching keywords, and rewriting bullets...
                  </div>
                ) : null}

                {result ? (
                  <div className="rounded-2xl border border-sky-300/10 bg-sky-300/5 px-4 py-4">
                    <p className="text-sm font-medium text-sky-100">
                      Most users improve 2-3 times before getting results
                    </p>
                    <button
                      type="button"
                      onClick={handleTryAnotherJobDescription}
                      className="mt-3 inline-flex items-center justify-center rounded-full border border-sky-300/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/10"
                    >
                      Try another job description
                    </button>
                  </div>
                ) : null}

                {showJobPrompt ? (
                  <section className="rounded-[1.25rem] border border-emerald-300/15 bg-emerald-300/5 p-4">
                    <h3 className="text-base font-semibold text-white">
                      Did you apply for this job?
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-stone-300">
                      If yes, save it to your tracker with the role and company.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <input
                        value={jobRole}
                        onChange={(event) => setJobRole(event.target.value)}
                        placeholder="Role"
                        className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                      />
                      <input
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        placeholder="Company"
                        className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleSaveAppliedJob}
                          className="inline-flex items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
                        >
                          Yes, save job
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowJobPrompt(false)}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                        >
                          Not now
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>

              {result ? (
                <div className="mt-6 grid gap-5">
                  <section className="rounded-[1.25rem] border border-white/10 bg-black/10 p-5">
                    <h3 className="text-lg font-semibold text-white">Improved Resume Text</h3>
                    <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-300">
                      {result.improvedText}
                    </pre>
                  </section>

                  <section className="rounded-[1.25rem] border border-white/10 bg-black/10 p-5">
                    <h3 className="text-lg font-semibold text-white">Keywords Added</h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {result.addedKeywords.length > 0 ? (
                        result.addedKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
                          >
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-stone-400">No additional keywords were suggested.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.25rem] border border-white/10 bg-black/10 p-5">
                    <h3 className="text-lg font-semibold text-white">Summary</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-300">
                      {result.improvementSummary.map((item) => (
                        <li
                          key={item}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/10 bg-black/10 p-6 text-sm leading-7 text-stone-400">
                  Your improved resume will appear here after you click <span className="text-stone-200">Improve Resume</span>.
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
