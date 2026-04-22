import { NextResponse } from "next/server";
import { matchResume } from "@/lib/match-resume";

type MatchRequestBody = {
  resumeText?: string;
  jobDescription?: string;
  mode?: "initial" | "refine";
  priorImprovedText?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchRequestBody;
    const resumeText = body.resumeText?.trim() ?? "";
    const jobDescription = body.jobDescription?.trim() ?? "";
    const mode = body.mode === "refine" ? "refine" : "initial";
    const priorImprovedText = body.priorImprovedText?.trim() ?? "";

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        {
          error: "Please provide both resumeText and jobDescription."
        },
        { status: 400 }
      );
    }

    if (resumeText.length > 20000 || jobDescription.length > 12000) {
      return NextResponse.json(
        {
          error: "Input is too large. Please shorten the resume or job description."
        },
        { status: 413 }
      );
    }

    const result = await matchResume({
      resumeText,
      jobDescription,
      mode,
      priorImprovedText
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while improving the resume.";
    const errorId = `match_${Date.now().toString(36)}`;
    const isConfigurationError =
      message.includes("No AI provider configured") || message.includes("Missing ");
    const isQuotaError =
      message.includes("quota") ||
      message.includes("Quota exceeded") ||
      message.includes("rate limit");
    const status = isConfigurationError ? 500 : 502;

    console.error("[/api/match]", {
      errorId,
      status,
      message,
      isConfigurationError,
      isQuotaError
    });

    const friendlyError = isQuotaError
      ? `AI service is temporarily busy. Please try again shortly. Reference: ${errorId}`
      : `Unable to improve the resume right now. Please try again in a moment. Reference: ${errorId}`;

    return NextResponse.json(
      {
        error: friendlyError
      },
      { status }
    );
  }
}
