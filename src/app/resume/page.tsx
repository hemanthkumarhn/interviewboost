"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/ui/logo-mark";

type BulletDiff = {
  before: string;
  after: string;
};

type MatchResponse = {
  improvedText: string;
  beforeAfterBullets: BulletDiff[];
  addedKeywords: string[];
  missingKeywords: string[];
  atsMatchScore: number;
  improvementSummary: string[];
};

type JobEntry = {
  id: string;
  role: string;
  company: string;
  status: "Applied";
};

const JOBS_STORAGE_KEY = "interviewboost-applied-jobs";

function scoreLabel(score: number) {
  if (score >= 80) {
    return "Strong match";
  }

  if (score >= 60) {
    return "Decent match";
  }

  return "Needs work";
}

function scoreTone(score: number) {
  if (score >= 80) {
    return "text-emerald-700 bg-emerald-100";
  }

  if (score >= 60) {
    return "text-amber-700 bg-amber-100";
  }

  return "text-rose-700 bg-rose-100";
}

export default function ResumePage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [showJobPrompt, setShowJobPrompt] = useState(false);
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
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

  async function extractPdfText(file: File) {
    const pdfjs = await import("pdfjs-dist/webpack.mjs");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer)
    }).promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
    }

    return pages.join("\n");
  }

  async function extractDocxText(file: File) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  async function extractResumeText(file: File) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".txt")) {
      return file.text();
    }

    if (fileName.endsWith(".pdf")) {
      return extractPdfText(file);
    }

    if (fileName.endsWith(".docx")) {
      return extractDocxText(file);
    }

    throw new Error("Please upload a PDF, DOCX, or TXT resume.");
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsingResume(true);
    setMessage(null);

    try {
      const text = await extractResumeText(file);

      if (!text.trim()) {
        throw new Error(
          "We could not extract readable text from this file. Try a text-based PDF, DOCX, or TXT resume."
        );
      }

      setResume(text.trim());
      setResumeFileName(file.name);
      setMessage(`Uploaded ${file.name} successfully.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to read that resume file."
      );
    } finally {
      setIsParsingResume(false);
      event.target.value = "";
    }
  }

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

      setResult(data);
      setMessage(
        mode === "refine" ?"Resume refined into a cleaner final version." :"Resume improved successfully."
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
      doc.setTextColor(...(options.color ?? [30, 30, 30]));

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
    addWrappedBlock("InterviewBoost Resume Export", {
      fontSize: 20,
      color: [15, 23, 42],
      gapAfter: 10
    });

    doc.setFont("helvetica", "normal");
    addWrappedBlock(`ATS Match Score: ${result.atsMatchScore}/100`, {
      fontSize: 11,
      color: [71, 85, 105],
      gapAfter: 20
    });

    doc.setFont("helvetica", "bold");
    addWrappedBlock("Improved Resume", {
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
      addWrappedBlock("Keywords Used Safely", {
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

    doc.save("interviewboost-improved-resume.pdf");
    setShowJobPrompt(true);
    setMessage(
      plan === "free" ?"PDF downloaded with InterviewBoost watermark." :"PDF downloaded without watermark."
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
    <main className="min-h-screen py-6 sm:py-8">
      <Container>
        <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <section className="border-b border-[var(--color-border)] px-6 py-6 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <LogoMark />
                <div className="mt-5 max-w-2xl">
                  <span className="inline-flex rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--color-brand)]">
                    Upload, compare, score, and export
                  </span>
                  <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-5xl">
                    Improve your resume for a specific job
                  </h1>
                  <p className="mt-4 text-base leading-8 text-[var(--color-text-soft)] sm:text-lg">
                    Upload an existing resume or paste the text manually, match it to
                    a real job description, and review safer before/after changes before
                    you export.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-brand)] transition hover:bg-[var(--color-surface-soft)]"
                >
                  Back to home
                </Link>
                <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1">
                  <button
                    type="button"
                    onClick={() => setPlan("free")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      plan === "free" ?"bg-[var(--color-brand)] text-white" :"text-[var(--color-text-soft)]"
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan("pro")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      plan === "pro" ?"bg-[var(--color-brand)] text-white" :"text-[var(--color-text-soft)]"
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10 lg:px-14">
            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="grid gap-6">
                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--color-text)]">Resume Input</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                        Paste text directly or upload a PDF, DOCX, or TXT resume.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]">
                      {isParsingResume ? "Reading resume..." : "Upload resume"}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={handleResumeUpload}
                        disabled={isParsingResume}
                      />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-4 text-sm text-[var(--color-text-soft)]">
                    {resumeFileName ? `Loaded file: ${resumeFileName}` : "No file uploaded yet."}
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-3 block text-sm font-medium text-[var(--color-text)]">
                      Resume text
                    </span>
                    <textarea
                      value={resume}
                      onChange={(event) => setResume(event.target.value)}
                      placeholder="Paste your resume here if you do not want to upload a file..."
                      className="min-h-[260px] w-full rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-base text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                  </label>
                </section>

                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6">
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">Job Description</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                    Paste the role description so InterviewBoost can tailor your resume to it.
                  </p>
                  <label className="mt-5 block">
                    <textarea
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the job description here..."
                      className="min-h-[240px] w-full rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-base text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                  </label>
                </section>

                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-text)]">Applied Jobs</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                        Minimal Phase 0 tracker for jobs you already applied to.
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
                      Phase 0
                    </span>
                  </div>

                  {appliedJobs.length > 0 ? (
                    <div className="mt-5 grid gap-3">
                      {appliedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex flex-col gap-3 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-base font-semibold text-[var(--color-text)]">{job.role}</p>
                            <p className="mt-1 text-sm text-[var(--color-text-soft)]">{job.company}</p>
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--color-accent)]">
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.25rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm leading-7 text-[var(--color-text-soft)]">
                      No jobs tracked yet. After PDF download, you can save the role and company here.
                    </div>
                  )}
                </section>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--color-text)]">Result Preview</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                      Review ATS score, bullet-level changes, and safer keywords before exporting.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
                    AI Output
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleImproveResume}
                      disabled={isLoading || isParsingResume || !resume.trim() || !jobDescription.trim()}
                      className="inline-flex min-w-[220px] items-center justify-center gap-3 rounded-full bg-[var(--color-brand)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-base font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Apply changes
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleImproveAgain}
                      disabled={isLoading || !result}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-brand)]/10 bg-white px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Improve again
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={!result || isLoading}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Download PDF
                    </button>
                  </div>

                  {message ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-4 text-sm text-[var(--color-text-soft)]">
                      {message}
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="rounded-2xl border border-[var(--color-accent)]/10 bg-[var(--color-accent-soft)] px-4 py-4 text-sm text-[var(--color-brand)]">
                      Analyzing your resume, checking keyword fit, rewriting bullets, and validating output...
                    </div>
                  ) : null}

                  {result ? (
                    <div className="rounded-2xl border border-[var(--color-brand)]/10 bg-white px-4 py-4">
                      <p className="text-sm font-medium text-[var(--color-brand)]">
                        Most users improve 2-3 times before getting results
                      </p>
                      <button
                        type="button"
                        onClick={handleTryAnotherJobDescription}
                        className="mt-3 inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)]"
                      >
                        Try another job description
                      </button>
                    </div>
                  ) : null}

                  {showJobPrompt ? (
                    <section className="rounded-[1.25rem] border border-[var(--color-accent)]/10 bg-white p-4">
                      <h3 className="text-base font-semibold text-[var(--color-text)]">
                        Did you apply for this job?
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                        If yes, save it to your tracker with the role and company.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <input
                          value={jobRole}
                          onChange={(event) => setJobRole(event.target.value)}
                          placeholder="Role"
                          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                        />
                        <input
                          value={company}
                          onChange={(event) => setCompany(event.target.value)}
                          placeholder="Company"
                          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleSaveAppliedJob}
                            className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
                          >
                            Yes, save job
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowJobPrompt(false)}
                            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
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
                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--color-text)]">ATS Match Score</h3>
                          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
                            A quick estimate of keyword fit, bullet quality, and job relevance.
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(result.atsMatchScore)}`}>
                          {scoreLabel(result.atsMatchScore)}
                        </span>
                      </div>
                      <div className="mt-5">
                        <div className="flex items-end justify-between">
                          <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--color-brand)]">
                            {result.atsMatchScore}
                          </p>
                          <p className="text-sm text-[var(--color-text-soft)]">out of 100</p>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-accent)]"
                            style={{ width: `${result.atsMatchScore}%` }}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Before vs After</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                        This view shows exactly how each bullet changed.
                      </p>
                      <div className="mt-5 grid gap-4">
                        {result.beforeAfterBullets.length > 0 ? (
                          result.beforeAfterBullets.map((bullet, index) => (
                            <div
                              key={`${bullet.before}-${index}`}
                              className="grid gap-3 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 lg:grid-cols-2"
                            >
                              <div className="rounded-2xl bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
                                  Before
                                </p>
                                <p className="mt-3 text-sm leading-7 text-[var(--color-text-soft)]">
                                  {bullet.before}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-[var(--color-surface-accent)] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                                  After
                                </p>
                                <p className="mt-3 text-sm leading-7 text-[var(--color-text)]">
                                  {bullet.after}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm leading-7 text-[var(--color-text-soft)]">
                            No bullet-level diff was returned for this run.
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Improved Resume Text</h3>
                      <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-soft)]">
                        {result.improvedText}
                      </pre>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">Keywords Used Safely</h3>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {result.addedKeywords.length > 0 ? (
                            result.addedKeywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]"
                              >
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-[var(--color-text-soft)]">
                              No supported keywords were added safely in this run.
                            </p>
                          )}
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">Missing Keywords</h3>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {result.missingKeywords.length > 0 ? (
                            result.missingKeywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-rose-50 px-3 py-2 text-sm text-rose-700"
                              >
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-[var(--color-text-soft)]">
                              No major unsupported keywords are missing from the current version.
                            </p>
                          )}
                        </div>
                      </section>
                    </div>

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Improvement Summary</h3>
                      <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-text-soft)]">
                        {result.improvementSummary.map((item) => (
                          <li
                            key={item}
                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--color-border)] bg-white p-6 text-sm leading-7 text-[var(--color-text-soft)]">
                    Upload or paste your resume, add the job description, and click{" "}
                    <span className="font-semibold text-[var(--color-text)]">Improve Resume</span>.
                    You will then see the ATS score, before/after bullet changes, safer keywords,
                    and the final improved version here.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
