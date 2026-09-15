"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui";

interface Stats {
  streak: number;
  completedTotal: number;
  completedThisWeek: number;
  openCount: number;
  overdueCount: number;
}

function Stat({ value, label, tone }: { value: number | string; label: string; tone?: string }) {
  return (
    <div className="flex-1 text-center">
      <p className={`text-xl font-semibold tabular-nums ${tone ?? "text-fg"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export function StatsCard({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;

  return (
    <Card>
      <CardBody className="flex items-center gap-2">
        <Stat
          value={stats.streak > 0 ? `${stats.streak}🔥` : "0"}
          label={stats.streak === 1 ? "day streak" : "day streak"}
          tone={stats.streak > 0 ? "text-accent" : undefined}
        />
        <div className="h-8 w-px bg-border" />
        <Stat value={stats.completedThisWeek} label="done this week" />
        <div className="h-8 w-px bg-border" />
        <Stat value={stats.openCount} label="open" />
        <div className="h-8 w-px bg-border" />
        <Stat
          value={stats.overdueCount}
          label="overdue"
          tone={stats.overdueCount > 0 ? "text-danger" : undefined}
        />
      </CardBody>
    </Card>
  );
}
