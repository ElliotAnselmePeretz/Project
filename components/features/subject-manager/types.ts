export interface Assessment {
  id: string;
  title: string;
  mark: number;
  maxMark: number;
  weight: number | null;
  takenAt: string | null;
  createdAt: string | null;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string | null;
  body: string;
  updatedAt: string | null;
}

export interface SubjectInfo {
  groupNumber: number;
  name: string;
  level: "HL" | "SL";
}

export interface SubjectData {
  subject: SubjectInfo;
  assessments: Assessment[];
  targetGrade: number | null;
  goals: Goal[];
  notes: Note[];
}
