"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SUBJECT_GROUPS, MIN_HL_COUNT, MAX_HL_COUNT, type SubjectLevel } from "@/lib/ib-subjects";
import { Badge, Banner, Button, Card, CardBody, Select, SectionTitle } from "@/components/ui";

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
  // Only saved subjects get a "Manage" link — the subject page needs the
  // selection to exist server-side, so linking an unsaved pick would 404.
  const [savedGroups, setSavedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => {
        const loaded = { ...EMPTY_CHOICES };
        const saved = new Set<number>();
        for (const row of d.subjects ?? []) {
          loaded[row.groupNumber] = { subjectName: row.subjectName, level: row.level };
          saved.add(row.groupNumber);
        }
        setChoices(loaded);
        setSavedGroups(saved);
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
      // A successful save writes all six, so every group is now manageable.
      if (res.ok) setSavedGroups(new Set(SUBJECT_GROUPS.map((g) => g.number)));
      setMessage(res.ok ? { text: "Saved.", ok: true } : { text: data.error ?? "Could not save", ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <section className="space-y-4">
      <div>
        <SectionTitle>Your DP subjects</SectionTitle>
        <p className="text-sm text-muted">
          Pick one subject per group, and a level for each. IB requires {MIN_HL_COUNT}–{MAX_HL_COUNT} at Higher
          Level (HL); the rest at Standard Level (SL).
        </p>
      </div>

      <div className="stagger space-y-3">
        {SUBJECT_GROUPS.map((group) => {
          const choice = choices[group.number];
          return (
            <Card key={group.number}>
              <CardBody className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                    Group {group.number} · {group.name}
                  </p>
                  {savedGroups.has(group.number) && (
                    <Link
                      href={`/subjects/${group.number}`}
                      className="shrink-0 text-xs font-medium text-accent hover:underline"
                    >
                      Manage →
                    </Link>
                  )}
                </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={choice.subjectName}
                  onChange={(e) => setSubject(group.number, e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select a subject…</option>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-1.5">
                  {(["HL", "SL"] as const).map((lvl) => (
                    <label
                      key={lvl}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                        choice.level === lvl && choice.subjectName
                          ? "border-accent bg-accent-soft font-medium text-accent"
                          : "border-border text-muted hover:border-border-strong"
                      } ${!choice.subjectName ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {/* The pill is the visible control; the radio stays for
                          keyboard and screen-reader users. */}
                      <input
                        type="radio"
                        name={`level-${group.number}`}
                        checked={choice.level === lvl}
                        onChange={() => setLevel(group.number, lvl)}
                        disabled={!choice.subjectName}
                        className="sr-only"
                      />
                      {lvl}
                    </label>
                  ))}
                </div>
              </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge tone={chosenCount === 6 ? "success" : "neutral"}>{chosenCount}/6 chosen</Badge>
          <Badge tone={hlCount >= MIN_HL_COUNT && hlCount <= MAX_HL_COUNT ? "success" : "warning"}>
            {hlCount} HL
          </Badge>
        </div>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save subjects"}
        </Button>
      </div>

      {message && <Banner tone={message.ok ? "success" : "danger"}>{message.text}</Banner>}
    </section>
  );
}
