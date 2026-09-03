"use client";

import { useCallback, useEffect, useState } from "react";
import { SPECIES_INFO, MAX_HUNGER, type Mood, type Species } from "@/lib/pets";
import { PetCreature } from "./PetCreature";
import { PetChooser } from "./PetChooser";
import Link from "next/link";
import { Badge, Banner, Button, Card, CardBody } from "@/components/ui";

export interface PetView {
  species: Species;
  name: string;
  hunger: number;
  mood: Mood;
  xp: number;
  level: number;
  progress: number;
  meals: number;
  hidden: boolean;
}

const MOOD_COPY: Record<Mood, string> = {
  happy: "Delighted with you.",
  content: "Doing fine.",
  hungry: "Getting peckish.",
  sad: "Feeling neglected.",
};

const MOOD_TONE: Record<Mood, "success" | "neutral" | "warning" | "danger"> = {
  happy: "success",
  content: "neutral",
  hungry: "warning",
  sad: "danger",
};

export function PetPanel({ compact = false }: { compact?: boolean }) {
  const [pet, setPet] = useState<PetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [justFed, setJustFed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pet");
    if (res.ok) setPet((await res.json()).pet);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(body: Record<string, unknown>) {
    const res = await fetch("/api/pet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Something went wrong");
      return null;
    }
    setPet(data.pet);
    return data;
  }

  async function onFeed() {
    setMessage(null);
    const data = await act({ action: "feed" });
    if (!data) return;
    setJustFed(true);
    setTimeout(() => setJustFed(false), 950);
    if (data.levelledUp) setMessage(`${data.pet.name} reached level ${data.pet.level}!`);
  }

  if (loading) return compact ? null : <p className="text-sm text-muted">Loading…</p>;

  if (!pet) {
    // On the dashboard, invite rather than nag: one quiet line, not the full chooser.
    return compact ? (
      <Link href="/pet" className="block">
        <Card className="transition-colors hover:border-accent/50">
          <CardBody className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Adopt a study pet — completing deadlines feeds it.
            </p>
            <span className="text-sm font-medium text-accent">Choose →</span>
          </CardBody>
        </Card>
      </Link>
    ) : (
      <PetChooser onAdopted={load} />
    );
  }

  const info = SPECIES_INFO[pet.species];

  // Hidden means hidden: the dashboard shows nothing at all. The pet page still
  // offers a way back, so the choice is never a one-way door.
  if (pet.hidden && compact) return null;

  if (pet.hidden) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {pet.name} is hidden. Still fed by your completed deadlines.
          </p>
          <Button size="sm" onClick={() => act({ action: "show" })}>
            Show
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardBody className={compact ? "flex items-center gap-4" : "space-y-4"}>
          <div className={compact ? "" : "flex flex-col items-center"}>
            <PetCreature
              species={pet.species}
              mood={pet.mood}
              size={compact ? 72 : 150}
              fed={justFed}
              body={info.hue.body}
              accent={info.hue.accent}
            />
          </div>

          <div className={`min-w-0 flex-1 ${compact ? "" : "text-center"}`}>
            <div className={`flex items-center gap-2 ${compact ? "" : "justify-center"}`}>
              <p className="truncate font-medium text-fg">{pet.name}</p>
              <Badge tone="accent">Lv {pet.level}</Badge>
              <Badge tone={MOOD_TONE[pet.mood]}>{MOOD_COPY[pet.mood]}</Badge>
            </div>

            {/* Hunger */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Hunger</span>
                <span>
                  {pet.hunger}/{MAX_HUNGER}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                  style={{ width: `${pet.hunger}%` }}
                />
              </div>
            </div>

            {/* Level progress */}
            {!compact && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Level {pet.level + 1}</span>
                  <span>{pet.xp} XP</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.round(pet.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className={`mt-4 flex items-center gap-2 ${compact ? "" : "justify-center"}`}>
              <Button variant="primary" size="sm" onClick={onFeed} disabled={pet.meals <= 0}>
                Feed{pet.meals > 0 ? ` (${pet.meals})` : ""}
              </Button>
              {!compact && (
                <Button variant="ghost" size="sm" onClick={() => act({ action: "hide" })}>
                  Hide
                </Button>
              )}
            </div>

            {pet.meals <= 0 && (
              <p className={`mt-2 text-xs text-faint ${compact ? "" : "text-center"}`}>
                Complete a deadline to earn a meal.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {message && <Banner tone="success">{message}</Banner>}
    </div>
  );
}
