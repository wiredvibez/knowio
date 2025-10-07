"use client";
import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

type TagDoc = { name: string; color: string; text_color: "light" | "dark" };

// Simple in-memory cache to avoid refetching tag metadata and prevent color flicker
const TAG_CACHE: Record<"from" | "relationship" | "character" | "field", Record<string, TagDoc>> = {
  from: {},
  relationship: {},
  character: {},
  field: {},
};

export function TagChips({ category, ids, nowrap = false, align = "start" }: { category: "from" | "relationship" | "character" | "field"; ids: string[]; nowrap?: boolean; align?: "start" | "end" }) {
  const initialDocs = useMemo(() => {
    const cacheForCategory = TAG_CACHE[category];
    const out: Record<string, TagDoc> = {};
    for (const id of ids) {
      const v = cacheForCategory[id];
      if (v) out[id] = v;
    }
    return out;
  }, [category, ids]);
  const [docs, setDocs] = useState<Record<string, TagDoc>>(initialDocs);
  const coll = useMemo(() => collection(db, `picker_${category}`), [category]);

  const idsKey = ids.join(',');
  useEffect(() => {
    (async () => {
      if (!ids || ids.length === 0) { setDocs({}); return; }
      const cacheForCategory = TAG_CACHE[category];
      const missing = ids.filter((id) => !cacheForCategory[id]);
      if (missing.length === 0) {
        // All present in cache; sync local state with cache without flicker
        const out: Record<string, TagDoc> = {};
        for (const id of ids) {
          const v = cacheForCategory[id];
          if (v) out[id] = v;
        }
        setDocs(out);
        return;
      }
      // Fetch only missing ids in batches of up to 10 (firestore 'in' constraint)
      const batches: string[][] = [];
      for (let i = 0; i < missing.length; i += 10) batches.push(missing.slice(i, i + 10));
      const fetched: Record<string, TagDoc> = {};
      for (const chunk of batches) {
        const q = query(coll, where(documentId(), 'in', chunk as string[]));
        const snap = await getDocs(q);
        snap.forEach((d) => { fetched[d.id] = d.data() as TagDoc; });
      }
      // Update cache and local state
      for (const [id, val] of Object.entries(fetched)) cacheForCategory[id] = val;
      const out: Record<string, TagDoc> = {};
      for (const id of ids) {
        const v = cacheForCategory[id] ?? fetched[id];
        if (v) out[id] = v;
      }
      setDocs(out);
    })();
  }, [coll, category, idsKey]);

  // Single-line mode clips at container edge; no fade/mask to avoid visual glitches
  return (
    <div className={nowrap ? (align === 'end' ? "flex justify-end gap-1 overflow-hidden min-w-0 w-full" : "flex gap-1 overflow-hidden min-w-0 w-full") : "flex flex-wrap gap-1"}>
      {ids.map((id) => {
        const t = docs[id];
        if (!t) return null; // avoid flashing placeholder until data is available
        const bg = t.color;
        const tc = t.text_color === 'light' ? '#fff' : '#111827';
        const label = t.name;
        return (
          <span key={id} className={nowrap ? "text-xs rounded px-1.5 py-0.5 shrink-0" : "text-xs rounded px-1.5 py-0.5"} style={{ backgroundColor: bg, color: tc }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}


