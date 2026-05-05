"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import type { User } from "@supabase/supabase-js";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/ui/logo-mark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

type ResumeDraftResponse = {
  draft: {
    id: string;
    resumeText: string;
    jobDescription: string;
    updatedAt: string;
  } | null;
  error?: string;
};

type JobEntry = {
  id: string;
  role: string;
  company: string;
  status: "Applied";
};

type ResumeBuilderState = {
  fullName: string;
  targetRole: string;
  location: string;
  yearsExperience: string;
  summary: string;
  skills: string;
  recentCompany: string;
  recentTitle: string;
  achievementOne: string;
  achievementTwo: string;
  education: string;
};

type PdfTemplateId = "classic" | "modern" | "executive" | "emerald" | "minimal";
type ResumeSection = {
  heading: string;
  lines: string[];
};

const JOBS_STORAGE_KEY = "interviewboost-applied-jobs";
const PDF_TEMPLATES: Array<{
  id: PdfTemplateId;
  name: string;
  accent: [number, number, number];
  fill: [number, number, number];
  summary: string;
}> = [
  { id: "classic", name: "Classic", accent: [18, 52, 88], fill: [241, 245, 249], summary: "Traditional one-column recruiter format" },
  { id: "modern", name: "Modern", accent: [17, 94, 89], fill: [236, 253, 245], summary: "Balanced contemporary layout with stronger section framing" },
  { id: "executive", name: "Executive", accent: [30, 41, 59], fill: [241, 245, 249], summary: "Formal business look with structured headings" },
  { id: "emerald", name: "Emerald", accent: [5, 150, 105], fill: [220, 252, 231], summary: "Brighter premium style for product and tech roles" },
  { id: "minimal", name: "Minimal", accent: [71, 85, 105], fill: [248, 250, 252], summary: "Clean ATS-first layout with very light ornamentation" }
];

const DEFAULT_SECTION_ORDER = [
  "PROFILE",
  "SUMMARY",
  "SKILLS",
  "EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "EDUCATION",
  "CERTIFICATIONS"
];

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

function parseResumeSections(text: string): ResumeSection[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (const line of lines) {
    const isHeading =
      /^[A-Z][A-Z\s/&-]{2,}$/.test(line) ||
      DEFAULT_SECTION_ORDER.includes(line.toUpperCase());

    if (isHeading) {
      currentSection = {
        heading: line.toUpperCase(),
        lines: []
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        heading: "PROFILE",
        lines: []
      };
      sections.push(currentSection);
    }

    currentSection.lines.push(line);
  }

  return sections.filter((section) => section.lines.length > 0);
}

function formatResumeText(text: string) {
  const sections = parseResumeSections(text);

  if (sections.length === 0) {
    return text.trim();
  }

  return sections
    .map((section) => `${section.heading}\n${section.lines.join("\n")}`)
    .join("\n\n")
    .trim();
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
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState("");
  const [isFetchingJobUrl, setIsFetchingJobUrl] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<JobEntry[]>([]);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateId>("classic");
  const [builderForm, setBuilderForm] = useState<ResumeBuilderState>({
    fullName: "",
    targetRole: "",
    location: "",
    yearsExperience: "",
    summary: "",
    skills: "",
    recentCompany: "",
    recentTitle: "",
    achievementOne: "",
    achievementTwo: "",
    education: ""
  });
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthUser(null);
      } else {
        setAuthUser(data.user ?? null);
      }

      setIsAuthLoading(false);
    };

    bootstrapSession();

    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setAuthUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      authState.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const syncDraft = async () => {
      await fetch("/api/users/bootstrap", { method: "POST" });

      const response = await fetch("/api/resumes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as ResumeDraftResponse;

      if (!data.draft) {
        return;
      }

      setResume((current) => current || formatResumeText(data.draft?.resumeText || ""));
      setJobDescription((current) => current || data.draft?.jobDescription || "");
    };

    syncDraft();
  }, [authUser]);

  async function handleGoogleSignIn() {
    if (!supabase) {
      setMessage("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/resume`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setAuthUser(null);
  }

  async function handleSaveDraft() {
    if (!authUser) {
      setMessage("Please sign in with Google to save your resume draft.");
      return;
    }

    setIsSavingDraft(true);

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeText: resume,
          jobDescription
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save your draft.");
      }

      setMessage("Draft saved to your account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your draft.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsingResume(true);
    setMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";

      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });

      const base64 = window.btoa(binary);

      const response = await fetch("/api/resume-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          base64
        })
      });

      const data = (await response.json()) as {
        fileName?: string;
        text?: string;
        error?: string;
      };

      if (!response.ok || !data.text) {
        throw new Error(data.error ?? "Unable to read that resume file.");
      }

      setResume(formatResumeText(data.text.trim()));
      setResumeFileName(data.fileName ?? file.name);
      setMessage(`Uploaded ${data.fileName ?? file.name} successfully.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to read that resume file."
      );
    } finally {
      setIsParsingResume(false);
      event.target.value = "";
    }
  }

  async function handleFetchJobDescriptionFromUrl() {
    if (!jobDescriptionUrl.trim()) {
      setMessage("Please enter a job description URL first.");
      return;
    }

    setIsFetchingJobUrl(true);
    setMessage(null);

    try {
      const response = await fetch("/api/job-description-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: jobDescriptionUrl
        })
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.error ?? "Unable to fetch the job description from that URL.");
      }

      setJobDescription(data.text.trim());
      setMessage("Job description imported from URL successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to fetch the job description from that URL."
      );
    } finally {
      setIsFetchingJobUrl(false);
    }
  }

  function handleBuilderChange(
    field: keyof ResumeBuilderState,
    value: string
  ) {
    setBuilderForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleGenerateResumeDraft() {
    const draftSections = [
      builderForm.fullName.trim(),
      builderForm.targetRole.trim()
        ? `${builderForm.targetRole.trim()}${builderForm.location.trim() ? ` | ${builderForm.location.trim()}` : ""}`
        : builderForm.location.trim(),
      builderForm.summary.trim()
        ? `PROFILE\n${builderForm.summary.trim()}`
        : "",
      builderForm.skills.trim()
        ? `SKILLS\n${builderForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
            .join(", ")}`
        : "",
      builderForm.recentCompany.trim() || builderForm.recentTitle.trim()
        ? `EXPERIENCE\n${builderForm.recentTitle.trim() || "Role"}${builderForm.recentCompany.trim() ? `, ${builderForm.recentCompany.trim()}` : ""}${builderForm.yearsExperience.trim() ? `\nExperience: ${builderForm.yearsExperience.trim()}` : ""}\n• ${builderForm.achievementOne.trim() || "Describe one strong contribution or project."}\n• ${builderForm.achievementTwo.trim() || "Describe another achievement, feature, or responsibility."}`
        : "",
      builderForm.education.trim()
        ? `EDUCATION\n${builderForm.education.trim()}`
        : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!draftSections.trim()) {
      setMessage("Add a few details in the quick builder before generating a resume draft.");
      return;
    }

    setResume(formatResumeText(draftSections.trim()));
    setResumeFileName("Generated from quick builder");
    setMessage("Resume draft generated from the quick builder.");
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
        mode === "refine"
          ? "Resume refined into a cleaner final version."
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

    setResume(formatResumeText(result.improvedText));
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

    const selectedTemplate =
      PDF_TEMPLATES.find((template) => template.id === pdfTemplate) ?? PDF_TEMPLATES[0];
    const sections = parseResumeSections(result.improvedText);

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

    const addSectionCard = (heading: string, lines: string[]) => {
      addPageIfNeeded(48);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, maxWidth, 34, 12, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...selectedTemplate.accent);
      doc.text(heading, margin + 14, y + 21);
      y += 46;
      doc.setFont("helvetica", "normal");
      lines.forEach((line) => {
        addWrappedBlock(line, {
          fontSize: 11,
          color: [30, 30, 30],
          gapAfter: 8
        });
      });
      y += 6;
    };

    doc.setFillColor(...selectedTemplate.fill);
    doc.roundedRect(24, 24, pageWidth - 48, pageHeight - 48, 28, 28, "F");

    doc.setFillColor(...selectedTemplate.accent);
    doc.roundedRect(margin, margin, pageWidth - margin * 2, 72, 20, 20, "F");

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
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(selectedTemplate.id === "executive" ? 18 : 20);
    doc.text("InterviewBoost Resume Export", margin + 16, margin + 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Template: ${selectedTemplate.name}`, margin + 16, margin + 50);
    y = margin + 98;

    if (selectedTemplate.id === "classic" || selectedTemplate.id === "minimal") {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Resume Snapshot", {
        fontSize: 20,
        color: selectedTemplate.accent,
        gapAfter: 10
      });

      doc.setFont("helvetica", "normal");
      addWrappedBlock(`ATS Match Score: ${result.atsMatchScore}/100`, {
        fontSize: 11,
        color: [71, 85, 105],
        gapAfter: 20
      });

      sections.forEach((section) => {
        addSectionCard(section.heading, section.lines);
      });
    } else if (selectedTemplate.id === "executive") {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Executive Resume Summary", {
        fontSize: 18,
        color: selectedTemplate.accent,
        gapAfter: 8
      });
      doc.setFont("helvetica", "normal");
      addWrappedBlock(
        `ATS Match Score: ${result.atsMatchScore}/100 | Template optimized for formal business presentation`,
        {
          fontSize: 10,
          color: [71, 85, 105],
          gapAfter: 18
        }
      );
      sections.forEach((section) => addSectionCard(section.heading, section.lines));
    } else {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Modern Resume Layout", {
        fontSize: 18,
        color: selectedTemplate.accent,
        gapAfter: 8
      });
      doc.setFont("helvetica", "normal");
      addWrappedBlock(
        `ATS Match Score: ${result.atsMatchScore}/100 | ${selectedTemplate.summary}`,
        {
          fontSize: 10,
          color: [71, 85, 105],
          gapAfter: 18
        }
      );
      sections.forEach((section) => addSectionCard(section.heading, section.lines));
    }

    if (result.addedKeywords.length > 0) {
      doc.setFont("helvetica", "bold");
      addWrappedBlock("Keywords Used Safely", {
        fontSize: 13,
        color: selectedTemplate.accent,
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
        color: selectedTemplate.accent,
        gapAfter: 10
      });

      doc.setFont("helvetica", "normal");
      result.improvementSummary.forEach((item) => {
        addWrappedBlock(`• ${item}`, {
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
    <main className="relative min-h-screen py-4 sm:py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-6rem] h-64 w-64 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
        <div className="absolute right-[-7rem] top-28 h-72 w-72 rounded-full bg-[var(--color-brand)]/20 blur-3xl" />
      </div>
      <Container>
        <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_90px_rgba(18,52,88,0.16)]">
          <section className="border-b border-[var(--color-border)] px-6 py-6 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <LogoMark />
                <div className="mt-5 max-w-2xl">
                  <span className="inline-flex rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)]/80 px-4 py-2 text-sm font-medium text-[var(--color-brand)] backdrop-blur">
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
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-brand)] transition hover:border-[var(--color-brand)]/30 hover:bg-[var(--color-surface-soft)]"
                >
                  Back to home
                </Link>
                <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1">
                  <button
                    type="button"
                    onClick={() => setPlan("free")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      plan === "free"
                        ? "bg-[var(--color-brand)] text-white"
                        : "text-[var(--color-text-soft)]"
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan("pro")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      plan === "pro"
                        ? "bg-[var(--color-brand)] text-white"
                        : "text-[var(--color-text-soft)]"
                    }`}
                  >
                    Pro
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isAuthLoading || !authUser}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-brand)] transition hover:border-[var(--color-brand)]/30 hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingDraft ? "Saving..." : "Save draft"}
                </button>
                {authUser ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--color-surface-soft)]"
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthLoading || !supabase}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAuthLoading
                      ? "Checking session..."
                      : supabase
                        ? "Sign in with Google"
                        : "Google sign-in unavailable"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-b from-white/40 to-transparent px-4 py-6 sm:px-8 lg:px-10 xl:px-12">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(460px,0.95fr)]">
              <div className="grid gap-6">
                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.07)] backdrop-blur">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--color-text)]">Resume Input</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-text-soft)]">
                        Paste text directly, upload a PDF, DOCX, or TXT resume, or generate a quick draft below. This panel is designed as your working area, so use it like a live editor instead of a single tiny form.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,52,88,0.25)] transition hover:bg-[var(--color-brand-strong)]">
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

                    <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface-soft)] to-white px-4 py-4 text-sm text-[var(--color-text-soft)]">
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

                  <div className="mt-6 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">
                          No resume yet? Use Quick Builder
                        </h3>
                      <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-soft)]">
                        Fill a few details and generate a starter resume draft instead of writing everything from scratch. This is useful for freshers or anyone who has experience details but not a prepared resume file.
                      </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateResumeDraft}
                        className="inline-flex items-center justify-center rounded-full border border-[var(--color-brand)]/20 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)]"
                      >
                        Generate draft
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <input
                        value={builderForm.fullName}
                        onChange={(event) => handleBuilderChange("fullName", event.target.value)}
                        placeholder="Full name"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                      <input
                        value={builderForm.targetRole}
                        onChange={(event) => handleBuilderChange("targetRole", event.target.value)}
                        placeholder="Target role"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                      <input
                        value={builderForm.location}
                        onChange={(event) => handleBuilderChange("location", event.target.value)}
                        placeholder="Location"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                      <input
                        value={builderForm.yearsExperience}
                        onChange={(event) => handleBuilderChange("yearsExperience", event.target.value)}
                        placeholder="Years of experience"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                    </div>

                    <textarea
                      value={builderForm.summary}
                      onChange={(event) => handleBuilderChange("summary", event.target.value)}
                      placeholder="Professional summary"
                      className="mt-4 min-h-[110px] w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                    <input
                      value={builderForm.skills}
                      onChange={(event) => handleBuilderChange("skills", event.target.value)}
                      placeholder="Skills separated by commas"
                      className="mt-4 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input
                        value={builderForm.recentTitle}
                        onChange={(event) => handleBuilderChange("recentTitle", event.target.value)}
                        placeholder="Most recent title"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                      <input
                        value={builderForm.recentCompany}
                        onChange={(event) => handleBuilderChange("recentCompany", event.target.value)}
                        placeholder="Most recent company"
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                      />
                    </div>
                    <textarea
                      value={builderForm.achievementOne}
                      onChange={(event) => handleBuilderChange("achievementOne", event.target.value)}
                      placeholder="Achievement or project highlight 1"
                      className="mt-4 min-h-[90px] w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                    <textarea
                      value={builderForm.achievementTwo}
                      onChange={(event) => handleBuilderChange("achievementTwo", event.target.value)}
                      placeholder="Achievement or project highlight 2"
                      className="mt-4 min-h-[90px] w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                    <textarea
                      value={builderForm.education}
                      onChange={(event) => handleBuilderChange("education", event.target.value)}
                      placeholder="Education details"
                      className="mt-4 min-h-[90px] w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.07)] backdrop-blur">
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">Job Description</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-text-soft)]">
                    Paste the role description or import it from a public job URL. Public pages work best; if a site blocks extraction, you can still paste the content manually.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={jobDescriptionUrl}
                      onChange={(event) => setJobDescriptionUrl(event.target.value)}
                      placeholder="Paste a job URL"
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                    <button
                      type="button"
                      onClick={handleFetchJobDescriptionFromUrl}
                      disabled={isFetchingJobUrl}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isFetchingJobUrl ? "Fetching..." : "Import from URL"}
                    </button>
                  </div>
                  <label className="mt-5 block">
                    <textarea
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the job description here..."
                      className="min-h-[240px] w-full rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-base text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10"
                    />
                  </label>
                </section>

                <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.07)] backdrop-blur">
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

              <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface-soft)] to-white p-5 shadow-[0_20px_50px_rgba(18,52,88,0.13)] sm:p-6 xl:sticky xl:top-6 xl:self-start">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--color-text)]">Result Preview</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-text-soft)]">
                      Review ATS score, bullet-level changes, safer keywords, and the polished resume before exporting.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)] shadow-sm">
                    AI Output
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleImproveResume}
                      disabled={isLoading || isParsingResume || !resume.trim() || !jobDescription.trim()}
                      className="inline-flex min-w-[220px] items-center justify-center gap-3 rounded-full bg-[var(--color-brand)] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(18,52,88,0.25)] transition hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-base font-semibold text-[var(--color-brand)] transition hover:border-[var(--color-brand)]/30 hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Apply changes
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleImproveAgain}
                      disabled={isLoading || !result}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-brand)]/20 bg-white px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Improve again
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={!result || isLoading}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-brand)]/20 hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Download PDF
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-[var(--color-text)]">Choose PDF template</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {PDF_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setPdfTemplate(template.id)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            pdfTemplate === template.id
                              ? "border-[var(--color-brand)] bg-[var(--color-surface-soft)] text-[var(--color-brand)]"
                              : "border-[var(--color-border)] bg-white text-[var(--color-text-soft)] hover:bg-[var(--color-surface)]"
                          }`}
                        >
                          <span className="block font-semibold">{template.name}</span>
                          <span className="mt-1 block text-xs leading-5">
                            {template.summary}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {message ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-4 text-sm text-[var(--color-text-soft)] shadow-sm">
                      {message}
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="rounded-2xl border border-[var(--color-accent)]/10 bg-[var(--color-accent-soft)] px-4 py-4 text-sm text-[var(--color-brand)]">
                      Analyzing your resume, checking keyword fit, rewriting bullets, and validating output...
                    </div>
                  ) : null}

                  {result ? (
                    <div className="rounded-2xl border border-[var(--color-brand)]/15 bg-white px-4 py-4 shadow-sm">
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
                    <section className="rounded-[1.25rem] border border-[var(--color-accent)]/15 bg-white p-4 shadow-sm">
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
                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Improved Resume Text</h3>
                      <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-soft)]">
                        {result.improvedText}
                      </pre>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

                      <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

                    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--color-border)] bg-white p-6 text-sm leading-7 text-[var(--color-text-soft)] shadow-sm">
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
