export const SUBJECT_GROUPS = [
  {
    number: 1,
    name: "Studies in Language and Literature",
    options: ["English A: Literature", "English A: Language and Literature", "Self-Taught Language A"],
  },
  {
    number: 2,
    name: "Language Acquisition",
    options: ["French B", "Spanish B", "French Ab Initio", "Spanish Ab Initio", "Mandarin B", "German B"],
  },
  {
    number: 3,
    name: "Individuals and Societies",
    options: ["Business Management", "Economics", "Geography", "History", "Psychology", "Global Politics", "Philosophy"],
  },
  {
    number: 4,
    name: "Sciences",
    options: ["Biology", "Chemistry", "Physics", "Computer Science", "Environmental Systems and Societies", "Sports, Exercise and Health Science"],
  },
  {
    number: 5,
    name: "Mathematics",
    options: ["Mathematics: Analysis and Approaches", "Mathematics: Applications and Interpretation"],
  },
  {
    number: 6,
    name: "The Arts",
    options: ["Visual Arts", "Music", "Theatre", "Film", "Dance", "None — second subject from groups 1–5 instead"],
  },
] as const;

export const SUBJECT_LEVELS = ["HL", "SL"] as const;
export type SubjectLevel = (typeof SUBJECT_LEVELS)[number];

export const MIN_HL_COUNT = 3;
export const MAX_HL_COUNT = 4;
export const TOTAL_SUBJECTS = 6;

const VALID_GROUPS: Set<number> = new Set(SUBJECT_GROUPS.map((g) => g.number));

export interface SubjectSelectionInput {
  groupNumber: number;
  subjectName: string;
  level: string;
}

/** Checks a full set of subject picks against IB's rules. Returns an error message, or null if valid. */
export function validateSelections(subjects: SubjectSelectionInput[]): string | null {
  if (subjects.length !== TOTAL_SUBJECTS) {
    return `Pick exactly ${TOTAL_SUBJECTS} subjects, one per group`;
  }

  const seenGroups = new Set<number>();
  let hlCount = 0;
  for (const s of subjects) {
    if (!VALID_GROUPS.has(s.groupNumber)) return `Unknown subject group: ${s.groupNumber}`;
    if (seenGroups.has(s.groupNumber)) return "Each subject group can only be chosen once";
    seenGroups.add(s.groupNumber);
    if (typeof s.subjectName !== "string" || s.subjectName.length === 0) return "Every subject needs a name";
    if (!SUBJECT_LEVELS.includes(s.level as SubjectLevel)) return "Level must be HL or SL";
    if (s.level === "HL") hlCount++;
  }

  if (hlCount < MIN_HL_COUNT || hlCount > MAX_HL_COUNT) {
    return `IB requires ${MIN_HL_COUNT}–${MAX_HL_COUNT} Higher Level subjects (you have ${hlCount})`;
  }

  return null;
}
