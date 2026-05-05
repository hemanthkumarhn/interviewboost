import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function extractResumeText(file: File) {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (fileName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileName.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  throw new Error("Please upload a PDF, DOCX, or TXT resume.");
}

async function extractResumeTextFromPayload(payload: {
  fileName: string;
  base64: string;
}) {
  const fileName = payload.fileName.toLowerCase();
  const buffer = Buffer.from(payload.base64, "base64");

  if (fileName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileName.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  throw new Error("Please upload a PDF, DOCX, or TXT resume.");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let fileName = "";
    let text = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        fileName?: string;
        base64?: string;
      };

      if (!body.fileName || !body.base64) {
        return NextResponse.json(
          {
            error: "Please choose a resume file to upload."
          },
          { status: 400 }
        );
      }

      fileName = body.fileName;
      text = (await extractResumeTextFromPayload({
        fileName: body.fileName,
        base64: body.base64
      })).trim();
    } else {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            error: "Please choose a resume file to upload."
          },
          { status: 400 }
        );
      }

      fileName = file.name;
      text = (await extractResumeText(file)).trim();
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "We could not extract readable text from this file. Try a text-based PDF, DOCX, or TXT resume."
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      fileName,
      text
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read that resume file.";

    console.error("[/api/resume-upload]", { message });

    return NextResponse.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
