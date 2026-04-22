type MatchResumeInput = {
  resumeText: string;
  jobDescription: string;
  mode?: "initial" | "refine";
  priorImprovedText?: string;
};

type BulletDiff = {
  before: string;
  after: string;
};

export type MatchResumeResult = {
  improvedText: string;
  beforeAfterBullets: BulletDiff[];
  addedKeywords: string[];
  missingKeywords: string[];
  atsMatchScore: number;
  improvementSummary: string[];
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type ParsedMatchResumeResult = Partial<MatchResumeResult> & {
  improvementSummary?: string[] | string;
  beforeAfterBullets?: Array<Partial<BulletDiff>>;
};

const RISKY_TERMS = [
  "swiftui",
  "uikit",
  "core data",
  "core animation",
  "deep linking",
  "analytics",
  "crash logs",
  "ios sdk",
  "dynamic modules",
  "access modifiers",
  "asynchronous code",
  "app performance",
  "clean code",
  "maintainable code",
  "well-documented code"
];

function buildPrompt({
  resumeText,
  jobDescription,
  mode = "initial",
  priorImprovedText
}: MatchResumeInput) {
  const sharedPrompt = [
    "You are a senior resume writer and ATS expert specializing in Indian job markets.",
    "",
    "Your job is to rewrite resume content to maximize interview chances for a specific job description.",
    "",
    "STRICT RULES:",
    "- Do NOT fabricate experience, results, skills, tools, frameworks, teams, or metrics.",
    "- Do NOT introduce technologies not clearly present in the original resume.",
    "- Improve clarity, impact, and ATS keyword alignment.",
    "- Use strong action verbs such as Built, Led, Optimized, Delivered, Developed, and Coordinated.",
    "- If measurable results are missing, strengthen the wording without inventing numbers.",
    "- Keep bullet points concise and realistic.",
    "- Maintain truth and realism at all times.",
    "",
    "ANALYSIS STEPS:",
    "1. Extract the top 10-15 important keywords from the job description.",
    "2. Identify which keywords are clearly supported by the original resume.",
    "3. Identify important keywords that are still missing from the resume.",
    "4. Rewrite each resume bullet more clearly and more strongly without fabricating details.",
    "5. Estimate an ATS match score from 0 to 100.",
    "",
    "SCORING LOGIC:",
    "- Keyword match: 40%",
    "- Bullet quality: 30%",
    "- Relevance to job: 30%",
    "",
    "RETURN RULES:",
    "- Return valid JSON only.",
    "- No markdown fences.",
    "- No commentary outside JSON.",
    "- Keep beforeAfterBullets grounded in the original resume text.",
    ""
  ];

  const modeSpecificPrompt =
    mode === "refine"
      ? [
          "SMART IMPROVEMENT MODE:",
          "- You are refining an already improved resume into a final polished version.",
          "- Make it more concise, increase impact, improve clarity, and remove redundancy.",
          "- Do not repeat previous wording when a stronger alternative is possible.",
          "- Keep the polished version realistic and ATS-friendly.",
          "",
          "Original Resume:",
          resumeText,
          "",
          "Previous Improved Resume:",
          priorImprovedText ?? "",
          "",
          "Job Description:",
          jobDescription
        ]
      : [
          "SMART IMPROVEMENT MODE:",
          "- If a bullet lacks measurable results, suggest realistic improvements WITHOUT inventing data.",
          "- Strengthen weak bullets using clarity, specificity, and action verbs.",
          "- Do not add fake percentages, revenue, customer satisfaction, or team size.",
          "- Example: \"Improved performance\" -> \"Improved system performance through optimization techniques\".",
          "",
          "Resume:",
          resumeText,
          "",
          "Job Description:",
          jobDescription
        ];

  return [
    ...sharedPrompt,
    ...modeSpecificPrompt,
    "",
    "Return this exact JSON shape:",
    '{',
    '  "improvedText": "string",',
    '  "beforeAfterBullets": [',
    '    { "before": "string", "after": "string" }',
    "  ],",
    '  "addedKeywords": ["string"],',
    '  "missingKeywords": ["string"],',
    '  "atsMatchScore": 0,',
    '  "improvementSummary": ["string"]',
    "}"
  ].join("\n");
}

function extractJsonObject(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return rawText.trim();
  }

  return rawText.slice(start, end + 1).trim();
}

function escapeControlCharsInJsonStrings(value: string) {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (const char of value) {
    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      isEscaped = true;
      continue;
    }

    if (char === "\"") {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasUnsupportedMetric(before: string, after: string, originalResumeText: string) {
  const metricPattern = /\b\d+(?:[.,]\d+)?%?|\b\d+\s?(?:x|years?|months?)\b/gi;
  const afterMatches = after.match(metricPattern) ?? [];

  if (afterMatches.length === 0) {
    return false;
  }

  const beforeNormalized = normalizeText(before);
  const originalNormalized = normalizeText(originalResumeText);

  return afterMatches.some((match) => {
    const normalizedMatch = normalizeText(match);
    return (
      !beforeNormalized.includes(normalizedMatch) &&
      !originalNormalized.includes(normalizedMatch)
    );
  });
}

function hasUnsupportedRiskyTerm(after: string, originalResumeText: string) {
  const afterNormalized = normalizeText(after);
  const originalNormalized = normalizeText(originalResumeText);

  return RISKY_TERMS.some(
    (term) => afterNormalized.includes(term) && !originalNormalized.includes(term)
  );
}

function clampScore(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeBeforeAfterBullets(
  bullets: BulletDiff[],
  resumeText: string
) {
  return bullets
    .map((bullet) => {
      const before = bullet.before.trim();
      const after = bullet.after.trim();

      if (!before || !after) {
        return null;
      }

      if (
        hasUnsupportedMetric(before, after, resumeText) ||
        hasUnsupportedRiskyTerm(after, resumeText)
      ) {
        return {
          before,
          after: before
        };
      }

      return {
        before,
        after
      };
    })
    .filter((bullet): bullet is BulletDiff => Boolean(bullet));
}

function extractSummary(value: ParsedMatchResumeResult["improvementSummary"]) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return (value as string)
      .split(/\n+/)
      .map((item) => item.replace(/^-+\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function buildImprovedText(
  parsedImprovedText: string | undefined,
  beforeAfterBullets: BulletDiff[],
  resumeText: string
) {
  if (typeof parsedImprovedText === "string" && parsedImprovedText.trim()) {
    return parsedImprovedText.trim();
  }

  if (beforeAfterBullets.length === 0) {
    return resumeText.trim();
  }

  return beforeAfterBullets.map((bullet) => `• ${bullet.after}`).join("\n");
}

function parseJsonResponse(rawText: string, input: MatchResumeInput): MatchResumeResult {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const jsonCandidate = extractJsonObject(cleaned);

  let parsed: ParsedMatchResumeResult;

  try {
    parsed = JSON.parse(jsonCandidate) as ParsedMatchResumeResult;
  } catch {
    parsed = JSON.parse(
      escapeControlCharsInJsonStrings(jsonCandidate)
    ) as ParsedMatchResumeResult;
  }

  const beforeAfterBullets = sanitizeBeforeAfterBullets(
    Array.isArray(parsed.beforeAfterBullets)
      ? parsed.beforeAfterBullets.map((item) => ({
          before: typeof item.before === "string" ? item.before : "",
          after: typeof item.after === "string" ? item.after : ""
        }))
      : [],
    input.resumeText
  );

  const improvedText = buildImprovedText(
    typeof parsed.improvedText === "string" ? parsed.improvedText : undefined,
    beforeAfterBullets,
    input.resumeText
  );

  const normalizedResume = normalizeText(input.resumeText);
  const normalizedImprovedText = normalizeText(improvedText);

  const addedKeywords = Array.isArray(parsed.addedKeywords)
    ? parsed.addedKeywords
        .filter((keyword): keyword is string => typeof keyword === "string")
        .map((keyword) => keyword.trim())
        .filter(
          (keyword) =>
            Boolean(keyword) &&
            normalizedImprovedText.includes(normalizeText(keyword)) &&
            normalizedResume.includes(normalizeText(keyword))
        )
    : [];

  const missingKeywords = Array.isArray(parsed.missingKeywords)
    ? parsed.missingKeywords
        .filter((keyword): keyword is string => typeof keyword === "string")
        .map((keyword) => keyword.trim())
        .filter(
          (keyword) =>
            Boolean(keyword) && !normalizedImprovedText.includes(normalizeText(keyword))
        )
    : [];

  const improvementSummary = extractSummary(parsed.improvementSummary);

  return {
    improvedText,
    beforeAfterBullets,
    addedKeywords,
    missingKeywords,
    atsMatchScore:
      typeof parsed.atsMatchScore === "number" ? clampScore(parsed.atsMatchScore) : 0,
    improvementSummary
  };
}

async function matchWithOpenAI(input: MatchResumeInput): Promise<MatchResumeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "You improve resumes conservatively, return valid JSON only, and never invent qualifications."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  const data = (await response.json()) as OpenAICompatibleResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed.");
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseJsonResponse(content, input);
}

async function matchWithGroq(input: MatchResumeInput): Promise<MatchResumeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You improve resumes conservatively, return valid JSON only, and never invent qualifications."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  const data = (await response.json()) as OpenAICompatibleResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Groq request failed.");
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return parseJsonResponse(content, input);
}

async function matchWithGemini(input: MatchResumeInput): Promise<MatchResumeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildPrompt(input)
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini request failed.");
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseJsonResponse(content, input);
}

export async function matchResume(input: MatchResumeInput): Promise<MatchResumeResult> {
  if (process.env.GROQ_API_KEY) {
    return matchWithGroq(input);
  }

  if (process.env.OPENAI_API_KEY) {
    return matchWithOpenAI(input);
  }

  if (process.env.GEMINI_API_KEY) {
    return matchWithGemini(input);
  }

  throw new Error(
    "No AI provider configured. Set GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in your environment."
  );
}
