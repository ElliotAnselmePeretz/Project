"use client";

import { useState } from "react";
import { DeadlineList } from "./DeadlineList";
import { StatsCard } from "./StatsCard";
import { PetPanel } from "@/components/features/pet/PetPanel";

/**
 * Ties the dashboard pieces together. Completing a deadline changes the stats
 * and feeds the pet, so both need to know when the list changes — this holds
 * the counter that tells them.
 */
export function Dashboard() {
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  return (
    <div className="space-y-4">
      <StatsCard refreshKey={version} />
      <PetPanel compact refreshKey={version} />
      <DeadlineList onChange={bump} />
    </div>
  );
}
