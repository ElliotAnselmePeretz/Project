import type { Difficulty, Focus, Purpose, SourceType, Urgency } from "@/lib/daily-study-planner";

export interface CandidateTask {
  key: string;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  subject: string | null;
  dueAt: string | null;
  confidence: number;
  dateConfirmed: boolean;
  difficulty: Difficulty;
  remainingMinutes: number;
  purpose: Purpose;
  purposeConfirmed: boolean;
}

export interface Block {
  id: string;
  position: number;
  kind: "study" | "unblock" | "break";
  minutes: number;
  taskKey: string | null;
  title: string;
  subject: string | null;
  purpose: Purpose | null;
  method: string | null;
  reason: string | null;
  urgency: Urgency | null;
  outcome: "finished" | "progress" | "stuck" | null;
  actualMinutes: number | null;
  edited: boolean;
  appliedMinutes: number;
}

export interface UnscheduledItem {
  key: string;
  title: string;
  subject: string | null;
  dueAt: string | null;
  remainingMinutes: number;
  urgency: Urgency;
  reason: string;
}

export interface PlanResponse {
  planDate: string;
  blocks: Block[];
  unscheduled: UnscheduledItem[];
  studyMinutes: number;
  breakMinutes: number;
  spareMinutes: number;
  urgentShortfallMinutes: number;
}

export interface Checkin {
  availableMinutes: number;
  focus: Focus;
  /** 'HH:MM' local time the session starts, for clock times on blocks. */
  startTime?: string | null;
}

/** 'HH:MM' for right now, in the student's local time. */
export function localTime(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The student's local calendar day — the server cannot infer their timezone. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const FOCUS_LABELS: Record<Focus, string> = {
  low: "Low",
  okay: "Okay",
  good: "Good",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  comfortable: "Comfortable",
  challenging: "Challenging but doable",
  stuck: "Stuck",
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  learn: "Learn",
  practise: "Practise",
  write: "Write or produce",
  submit: "Submit",
};
