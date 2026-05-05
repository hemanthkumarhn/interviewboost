export type ResumeSection = {
  heading: string;
  lines: string[];
};

export const DEFAULT_SECTION_ORDER = [
  "PROFILE",
  "SUMMARY",
  "SKILLS",
  "TECHNICAL SKILLS",
  "EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "EDUCATION",
  "CERTIFICATIONS",
  "ACHIEVEMENTS"
];

function normalizeHeading(text: string) {
  return text
    .toUpperCase()
    .replace(/[:|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseResumeSections(text: string): ResumeSection[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (const line of lines) {
    const normalizedLine = normalizeHeading(line);
    const isHeading =
      /^[A-Z][A-Z\s/&-]{2,}$/.test(line) ||
      DEFAULT_SECTION_ORDER.includes(normalizedLine);

    if (isHeading) {
      currentSection = {
        heading: normalizedLine,
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

    currentSection.lines.push(line.replace(/^[•·]\s*/, "").trim());
  }

  return sections.filter((section) => section.lines.length > 0);
}

export function formatResumeText(text: string) {
  const sections = parseResumeSections(text);

  if (sections.length === 0) {
    return text.trim();
  }

  return sections
    .map((section) => `${section.heading}\n${section.lines.join("\n")}`)
    .join("\n\n")
    .trim();
}

export function sectionsToText(sections: ResumeSection[]) {
  return sections
    .filter((section) => section.lines.length > 0)
    .map((section) => `${section.heading}\n${section.lines.join("\n")}`)
    .join("\n\n")
    .trim();
}

export function dedupeSections(sections: ResumeSection[]) {
  const seen = new Set<string>();

  return sections
    .map((section) => ({
      heading: normalizeHeading(section.heading),
      lines: section.lines
        .map((line) => line.trim())
        .filter((line) => {
          const key = `${normalizeHeading(section.heading)}::${line.toLowerCase()}`;

          if (!line || seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
    }))
    .filter((section) => section.lines.length > 0);
}
