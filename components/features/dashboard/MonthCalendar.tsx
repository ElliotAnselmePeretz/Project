"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { dayKey, groupByDay, monthGrid, KIND_LABELS, WEEKDAY_LABELS, type AgendaItem } from "@/lib/dashboard";
import { KIND_TONES, type AgendaItemJson } from "./types";

export function MonthCalendar({ items }: { items: AgendaItemJson[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(dayKey(today));

  const parsed: AgendaItem[] = useMemo(
    () => items.map((i) => ({ ...i, dueAt: new Date(i.dueAt) })),
    [items],
  );
  const byDay = useMemo(() => groupByDay(parsed), [parsed]);
  const weeks = monthGrid(cursor.year, cursor.month);
  const todayKey = dayKey(today);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function shift(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const selectedItems = byDay.get(selected) ?? [];
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card>
      <CardHeader
        title={monthLabel}
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Previous month">
              ←
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCursor({ year: today.getFullYear(), month: today.getMonth() });
                setSelected(todayKey);
              }}
            >
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Next month">
              →
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-4">
        <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} role="columnheader" className="pb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
              {d}
            </div>
          ))}

          {weeks.flat().map((day) => {
            const count = byDay.get(day.key)?.length ?? 0;
            const isToday = day.key === todayKey;
            const isSelected = day.key === selected;
            return (
              <button
                key={day.key}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${day.date.toLocaleDateString()}${count ? `, ${count} due` : ""}`}
                onClick={() => setSelected(day.key)}
                className={`relative flex h-10 flex-col items-center justify-center rounded-md text-sm tabular-nums transition-colors ${
                  isSelected
                    ? "bg-accent text-accent-fg"
                    : isToday
                      ? "bg-accent-soft font-semibold text-accent"
                      : day.inMonth
                        ? "text-fg hover:bg-surface-alt"
                        : "text-faint hover:bg-surface-alt"
                }`}
              >
                {day.date.getDate()}
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-accent-fg" : "bg-accent"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium text-fg">{selectedLabel}</p>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted">Nothing due.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-alt"
                  >
                    <Badge tone={KIND_TONES[item.kind]}>{KIND_LABELS[item.kind]}</Badge>
                    <span className="min-w-0 flex-1 truncate text-fg">{item.title}</span>
                    {item.context && <span className="shrink-0 text-xs text-muted">{item.context}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
