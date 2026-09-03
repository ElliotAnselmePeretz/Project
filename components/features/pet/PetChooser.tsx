"use client";

import { useState } from "react";
import { SPECIES, SPECIES_INFO, type Species } from "@/lib/pets";
import { PetCreature } from "./PetCreature";
import { Button, Card, CardBody, Input, Field } from "@/components/ui";

export function PetChooser({ onAdopted }: { onAdopted: () => void }) {
  const [chosen, setChosen] = useState<Species | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function adopt() {
    if (!chosen) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: chosen, name }),
      });
      if (res.ok) onAdopted();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Pick a companion. Completing a deadline earns a meal; meals feed your pet and it levels up.
        Entirely optional — you can hide it whenever you like.
      </p>

      <div className="stagger grid gap-3 sm:grid-cols-3">
        {SPECIES.map((id) => {
          const info = SPECIES_INFO[id];
          const active = chosen === id;
          return (
            <button key={id} onClick={() => setChosen(id)} aria-pressed={active} className="text-left">
              <Card
                className={`h-full transition-all duration-200 ${
                  active ? "border-accent ring-2 ring-accent/30" : ""
                }`}
              >
                <CardBody className="flex flex-col items-center gap-2 text-center">
                  <PetCreature
                    species={id}
                    mood="happy"
                    size={96}
                    body={info.hue.body}
                    accent={info.hue.accent}
                  />
                  <p className="font-medium text-fg">{info.name}</p>
                  <p className="text-xs leading-relaxed text-muted">{info.tagline}</p>
                </CardBody>
              </Card>
            </button>
          );
        })}
      </div>

      {chosen && (
        <Card className="animate-fade-up">
          <CardBody className="space-y-3">
            <Field label="Name your pet" hint="Optional — we'll call it Buddy otherwise.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={SPECIES_INFO[chosen].name}
                maxLength={24}
              />
            </Field>
            <Button variant="primary" onClick={adopt} disabled={saving}>
              {saving ? "Adopting…" : `Adopt ${name.trim() || SPECIES_INFO[chosen].name}`}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
