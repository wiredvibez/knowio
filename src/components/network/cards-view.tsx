"use client";
import { useEffect, useRef } from "react";
import type { EntityDoc } from "@/types/firestore";
import { TagChips } from "@/components/tags/tag-chips";
import { TypeChip } from "@/components/network/type-chip";
import { auth } from "@/lib/firebase";
import { ContactIcons } from "@/components/entity/contact-chips";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";

function SharedChip() {
  return <span className="text-[10px] ms-2 rounded-full border px-2 py-0.5 bg-white text-foreground/80">משותף</span>;
}

export function EntitiesCards({ rows, onOpen, onEndReached, loadingMore, selectedIds, onToggle }: { rows: (EntityDoc & { id: string })[]; onOpen?: (id: string) => void; onEndReached?: () => void; loadingMore?: boolean; selectedIds?: Set<string>; onToggle?: (id: string, checked: boolean) => void }) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || !onEndReached) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) onEndReached();
    }, { root: null, rootMargin: "0px 0px 200px 0px", threshold: 0 });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [onEndReached, rows.length, loadingMore]);

  return (
    <div className="mb-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((e) => (
          <div key={e.id} className="rounded-xl border p-3 flex flex-col md:flex-row gap-3 cursor-pointer max-w-full overflow-hidden" onClick={() => onOpen?.(e.id)}>
            <div className="flex flex-col items-start">
              <AnimatedCheckbox size="md" className="mb-2" checked={selectedIds?.has(e.id) ?? false} onCheckedChange={(v) => onToggle?.(e.id, Boolean(v))} onClick={(ev)=>ev.stopPropagation()} />
              <div className="h-16 w-16 rounded-lg bg-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center min-w-0">
                <span className="truncate" title={e.name}>{e.name}</span>
                <TypeChip type={e.type} />
                {auth.currentUser?.uid && e.owner_id !== auth.currentUser?.uid ? <SharedChip /> : null}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">{e.info}</div>
              <div className="mt-2 flex flex-col md:flex-row gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <TagChips category="from" ids={(e.from ?? []).slice(0, 3)} />
                  <TagChips category="relationship" ids={(e.relationship ?? []).slice(0, 3)} />
                  <div className="mt-2">
                    <ContactIcons contact={e.contact} />
                  </div>
                </div>
                <div className="md:w-40 w-full md:shrink-0">
                  <div className="text-[10px] text-muted-foreground mb-1">תכונות ואישיות</div>
                  <div className="overflow-hidden min-w-0 w-full">
                    <TagChips category="character" ids={(e.character ?? [])} nowrap align="start" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 mb-1">מקצוע, כלים ותוכן</div>
                  <div className="overflow-hidden min-w-0 w-full">
                    <TagChips category="field" ids={(e.field ?? [])} nowrap align="start" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {loadingMore ? (
        <div className="py-3 text-center text-sm text-muted-foreground">Loading more…</div>
      ) : null}
      <div className="h-6" ref={sentinelRef} />
    </div>
  );
}


