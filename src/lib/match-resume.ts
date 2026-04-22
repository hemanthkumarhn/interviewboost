type MatchResumeInput = {
  resumeText: string;
  jobDescription: string;
  mode?: "initial" | "refine";
  priorImprovedText?: string;
};

export type MatchResumeResult = {
  improvedText: string;
  addedKeywords: string[];
  improvementSummary: string[];
};

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GroqResponse = OpenAIResponse;

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
    "- Do NOT fabricate experience or add skills not present in the original resume.",
    "- Improve clarity, impact, and ATS keyword alignment.",
    "- Use strong action verbs (e.g., Built, Led, Optimized, Delivered).",
    "- Add measurable impact wherever possible (%, time saved, revenue, scale).",
    "- Keep bullet points concise (1–2 lines max).",
    "- Maintain truth and realism.",
    "",
    "STYLE:",
    "- Professional, crisp, results-oriented.",
    "- Avoid generic phrases like \"responsible for\".",
    "- Focus on outcomes, not tasks.",
    "",
    "OUTPUT RULES:",
    "- Add job-description keywords only when they are reasonably supported by the original resume.",
    "- Preserve the candidate's credibility and overall background.",
    "- Return valid JSON only, with no markdown fences.",
    ""
  ];

  const modeSpecificPrompt =
    mode === "refine"
      ? [
          "SMART IMPROVEMENT MODE:",
          "- You are refining an already improved resume into a final polished version.",
          "- Make it more concise, increase impact, improve clarity, and remove redundancy.",
          "- Do not repeat previous wording when a stronger alternative is possible.",
          "- Keep it realistic, ATS-friendly, and grounded in the original resume.",
          "- If a bullet lacks measurable results, strengthen it without inventing data.",
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
          "- Do not add fake percentages, revenue, team size, or timelines.",
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
    '{ "improvedText": "string", "addedKeywords": ["string"], "improvementSummary": ["string"] }'
  ].join("\n");
}

function parseJsonResponse(rawText: string): MatchResumeResult {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<MatchResumeResult>;

  if (
    typeof parsed.improvedText !== "string" ||
    !Array.isArray(parsed.addedKeywords) ||
    !Array.isArray(parsed.improvementSummary)
  ) {
    throw new Error("The AI response did not match the expected JSON shape.");
  }

  return {
    improvedText: parsed.improvedText.trim(),
    addedKeywords: parsed.addedKeywords
      .filter((keyword): keyword is string => typeof keyword === "string")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    improvementSummary: parsed.improvementSummary
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
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
            "You improve resumes conservatively and never invent qualifications."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed.");
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseJsonResponse(content);
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

  const data = (await response.json()) as GroqResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Groq request failed.");
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return parseJsonResponse(content);
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

  return parseJsonResponse(content);
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
