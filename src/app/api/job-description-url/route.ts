import { NextResponse } from "next/server";

export const runtime = "nodejs";

const JOB_BOARD_HOST_HINTS = [
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "greenhouse.io",
  "lever.co",
  "wellfound.com",
  "foundit.in",
  "workday.com"
];

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

function extractJsonLdDescriptions(html: string) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  return matches
    .map((match) => match[1])
    .flatMap((block) => {
      try {
        const parsed = JSON.parse(block) as Record<string, unknown> | Array<Record<string, unknown>>;
        const records = Array.isArray(parsed) ? parsed : [parsed];

        return records.flatMap((record) => {
          const description = typeof record.description === "string" ? record.description : "";
          const title = typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : "";
          return [title, description].filter(Boolean);
        });
      } catch {
        return [];
      }
    })
    .join("\n");
}

function extractMetaDescriptions(html: string) {
  const metaMatches = [
    ...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)
  ];

  return metaMatches.map((match) => match[1]).join("\n");
}

function extractJobLikeText(html: string) {
  const jsonLd = extractJsonLdDescriptions(html);
  const meta = extractMetaDescriptions(html);
  const bodyText = stripHtml(html);

  return [jsonLd, meta, bodyText]
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18000);
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

    let text = "";
    const shouldPreferProxy = JOB_BOARD_HOST_HINTS.some((host) =>
      parsedUrl.hostname.includes(host)
    );

    if (!shouldPreferProxy) {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; InterviewBoostBot/1.0; +https://interviewboost.in)"
        },
        redirect: "follow"
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("text/html")) {
          const html = await response.text();
          text = extractJobLikeText(html);
        }
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
        text = (await proxyResponse.text()).replace(/\s+/g, " ").trim().slice(0, 18000);
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
