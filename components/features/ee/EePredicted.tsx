"use client";

import { useEffect, useState } from "react";
import { Banner, Card, CardBody, CardHeader, Select } from "@/components/ui";
import { EE_GRADES } from "@/lib/ee";

/** The predicted grade control. The EE page shows the result; this sets it. */
export function EePredicted() {
  const [grade, setGrade] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ee")
      .then((r) => r.json())
      .then((d) => setGrade(d.essay?.predictedGrade ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(value: string) {
    setGrade(value);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictedGrade: value || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Could not save that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Banner tone="danger">{error}</Banner>}
      <Card>
        <CardHeader title="Predicted grade" subtitle="The extended essay is graded A to E." />
        <CardBody>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-accent-soft text-3xl font-semibold text-accent"
            >
              {loading ? "" : (grade || "—")}
            </span>
            <div className="min-w-0">
              <Select
                aria-label="Predicted grade"
                value={grade}
                disabled={busy || loading}
                onChange={(e) => save(e.target.value)}
                className="w-32"
              >
                <option value="">Not set</option>
                {EE_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-muted">
                Your own estimate, or what your supervisor has told you.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
