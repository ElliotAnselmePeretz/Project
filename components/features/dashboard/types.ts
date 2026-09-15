import type { AgendaKind } from "@/lib/dashboard";
import type { UpdateJson } from "@/components/features/updates/UpdatesList";

/** An agenda item as it arrives over JSON — dates are strings until parsed. */
export interface AgendaItemJson {
  id: string;
  kind: AgendaKind;
  title: string;
  context: string | null;
  dueAt: string;
  href: string;
}

export interface GoalJson {
  id: string;
  text: string;
  context: string;
  href: string;
}

export interface SubjectSummaryJson {
  groupNumber: number;
  name: string;
  level: "HL" | "SL";
  averagePercent: number | null;
  targetGrade: number | null;
  iaLabel: string;
  iaStage: string | null;
}

export interface DashboardData {
  updates: UpdateJson[];
  unreadUpdateCount: number;
  agenda: AgendaItemJson[];
  calendar: AgendaItemJson[];
  goals: GoalJson[];
  openGoalCount: number;
  subjects: SubjectSummaryJson[];
  core: {
    ee: { stage: string | null; predictedGrade: string | null; wordCount: number | null; wordLimit: number | null } | null;
    tok: { component: string; label: string; stage: string | null; predictedGrade: string | null }[];
    cas: {
      totalHours: number;
      byStrand: { creativity: number; activity: number; service: number };
      activityCount: number;
      hasProject: boolean;
    };
  };
}

export const KIND_TONES: Record<AgendaKind, "neutral" | "info" | "accent" | "success"> = {
  deadline: "neutral",
  ia: "info",
  ee: "accent",
  tok: "success",
};
