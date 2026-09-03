"use client";

import { useEffect, useState } from "react";
import { SUBJECT_GROUPS, MIN_HL_COUNT, MAX_HL_COUNT, type SubjectLevel } from "@/lib/ib-subjects";

interface Choice {
  subjectName: string;
  level: SubjectLevel;
}

const EMPTY_CHOICES: Record<number, Choice> = Object.fromEntries(
  SUBJECT_GROUPS.map((g) => [g.number, { subjectName: "", level: "SL" as SubjectLevel }]),
);

export function SubjectSelection() {
  const [choices, setChoices] = useState<Record<number, Choice>>(EMPTY_CHOICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => {
        const loaded = { ...EMPTY_CHOICES };
        for (const row of d.subjects ?? []) {
          loaded[row.groupNumber] = { subjectName: row.subjectName, level: row.level };
        }
        setChoices(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hlCount = Object.values(choices).filter((c) => c.subjectName && c.level === "HL").length;
  const chosenCount = Object.values(choices).filter((c) => c.subjectName).length;

  function setSubject(groupNumber: number, subjectName: string) {
    setChoices((cur) => ({ ...cur, [groupNumber]: { ...cur[groupNumber], subjectName } }));
  }

  function setLevel(groupNumber: number, level: SubjectLevel) {
    setChoices((cur) => ({ ...cur, [groupNumber]: { ...cur[groupNumber], level } }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const subjects = SUBJECT_GROUPS.map((g) => ({
        groupNumber: g.number,
        subjectName: choices[g.number].subjectName,
        level: choices[g.number].level,
      }));
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects }),
      });
      const data = await res.json();
      setMessage(res.ok ? { text: "Saved.", ok: true } : { text: data.error ?? "Could not save", ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-medium">Your DP subjects</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick one subject per group, and a level for each. IB requires {MIN_HL_COUNT}–{MAX_HL_COUNT} at Higher
          Level (HL); the rest at Standard Level (SL).
        </p>
      </div>

      <div className="space-y-3">
        {SUBJECT_GROUPS.map((group) => {
          const choice = choices[group.number];
          return (
            <div
              key={group.number}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Group {group.number} · {group.name}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={choice.subjectName}
                  onChange={(e) => setSubject(group.number, e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                >
                  <option value="">Select a subject…</option>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3 text-sm">
                  {(["HL", "SL"] as const).map((lvl) => (
                    <label key={lvl} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`level-${group.number}`}
                        checked={choice.level === lvl}
                        onChange={() => setLevel(group.number, lvl)}
                        disabled={!choice.subjectName}
                      />
                      {lvl}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          {chosenCount}/6 chosen · {hlCount} HL
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save subjects"}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </section>
  );
}
