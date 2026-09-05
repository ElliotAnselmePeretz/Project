export interface IaRecord {
  label: string | null;
  title: string | null;
  supervisor: string | null;
  stage: string | null;
  lengthCount: number | null;
  lengthLimit: number | null;
  draftDueAt: string | null;
  finalDueAt: string | null;
}

export interface Criterion {
  id: string;
  name: string;
  maxMark: number;
  selfMark: number | null;
}

export interface FeedbackEntry {
  id: string;
  note: string;
  response: string | null;
  givenAt: string | null;
  createdAt: string | null;
}

export interface IaData {
  subject: { groupNumber: number; name: string; level: "HL" | "SL" };
  label: string;
  lengthUnit: "words" | "minutes";
  ia: IaRecord | null;
  criteria: Criterion[];
  feedback: FeedbackEntry[];
}
