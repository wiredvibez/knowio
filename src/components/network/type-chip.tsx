"use client";
import type { EntityDoc } from "@/types/firestore";

export function TypeChip({ type }: { type: EntityDoc["type"] }) {
  const map: Record<string, string> = {
    person: "אישיות",
    organization: "ארגון",
    community: "קהילה",
    group: "קבוצה",
    other: "אחר",
  };
  return (
    <span className="text-[10px] ms-2 rounded-full border px-2 py-0.5 bg-white text-foreground/80">
      {map[type] ?? type}
    </span>
  );
}


