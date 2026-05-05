import { NextResponse } from "next/server";

export const runtime = "nodejs";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim() ?? "";

    if (!url) {
      return NextResponse.json(
        {
          error: "Please provide a job description URL."
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          error: "Please enter a valid URL."
        },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        {
          error: "Only http and https URLs are supported."
        },
        { status: 400 }
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InterviewBoostBot/1.0; +https://interviewboost.in)"
      },
      redirect: "follow"
    });

    let text = "";

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("text/html")) {
        const html = await response.text();
        text = stripHtml(html).slice(0, 15000);
      }
    }

    if (!text) {
      const proxyUrl = `https://r.jina.ai/http://${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
      const proxyResponse = await fetch(proxyUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; InterviewBoostBot/1.0; +https://interviewboost.in)"
        }
      });

      if (proxyResponse.ok) {
        text = (await proxyResponse.text()).replace(/\s+/g, " ").trim().slice(0, 15000);
      }
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "We could not extract readable job description text from that URL. Try pasting the description manually."
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch the job description from that URL.";

    console.error("[/api/job-description-url]", { message });

    return NextResponse.json(
      {
        error: "Unable to fetch the job description from that URL."
      },
      { status: 500 }
    );
  }
}
