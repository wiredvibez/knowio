"use client";
import type { EntityDoc } from "@/types/firestore";
import { TagChips } from "@/components/tags/tag-chips";
import { TypeChip } from "@/components/network/type-chip";
import { auth } from "@/lib/firebase";

function SharedChip() {
  return <span className="text-[10px] ms-2 rounded-full border px-2 py-0.5 bg-white text-foreground/80">משותף</span>;
}

export function EntitiesCards({ rows, onOpen }: { rows: (EntityDoc & { id: string })[]; onOpen?: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((e) => (
        <div key={e.id} className="rounded-xl border p-3 flex gap-3 cursor-pointer" onClick={() => onOpen?.(e.id)}>
          <div className="h-16 w-16 rounded-lg bg-muted" />
          <div className="flex-1">
            <div className="font-semibold flex items-center">
              <span className="truncate" title={e.name}>{e.name}</span>
              <TypeChip type={e.type} />
              {auth.currentUser?.uid && e.owner_id !== auth.currentUser?.uid ? <SharedChip /> : null}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">{e.info}</div>
            <div className="mt-2 space-y-1">
              <TagChips category="from" ids={(e.from ?? []).slice(0, 3)} />
              <TagChips category="relationship" ids={(e.relationship ?? []).slice(0, 3)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


