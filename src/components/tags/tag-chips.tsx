"use client";
import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

type TagDoc = { name: string; color: string; text_color: "light" | "dark" };

export function TagChips({ category, ids, nowrap = false, align = "start" }: { category: "from" | "relationship" | "character" | "field"; ids: string[]; nowrap?: boolean; align?: "start" | "end" }) {
  const [docs, setDocs] = useState<Record<string, TagDoc>>({});
  const coll = useMemo(() => collection(db, `picker_${category}`), [category]);

  const idsKey = ids.join(',');
  useEffect(() => {
    (async () => {
      if (!ids || ids.length === 0) { setDocs({}); return; }
      // batch by chunks of up to 10 for 'in' query
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) batches.push(ids.slice(i, i + 10));
      const out: Record<string, TagDoc> = {};
      for (const chunk of batches) {
        const q = query(coll, where(documentId(), 'in', chunk as string[]));
        const snap = await getDocs(q);
        snap.forEach((d) => { out[d.id] = d.data() as TagDoc; });
      }
      setDocs(out);
    })();
  }, [coll, idsKey, ids]);

  // Single-line mode clips at container edge; no fade/mask to avoid visual glitches
  return (
    <div className={nowrap ? (align === 'end' ? "flex justify-end gap-1 overflow-hidden min-w-0 w-full" : "flex gap-1 overflow-hidden min-w-0 w-full") : "flex flex-wrap gap-1"}>
      {ids.map((id) => {
        const t = docs[id];
        const bg = t?.color ?? '#eef';
        const tc = t?.text_color === 'light' ? '#fff' : '#111827';
        const label = t?.name ?? id;
        return (
          <span key={id} className={nowrap ? "text-xs rounded px-1.5 py-0.5 shrink-0" : "text-xs rounded px-1.5 py-0.5"} style={{ backgroundColor: bg, color: tc }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}


