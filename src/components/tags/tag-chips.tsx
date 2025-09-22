"use client";
import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

type TagDoc = { name: string; color: string; text_color: "light" | "dark" };

export function TagChips({ category, ids }: { category: "from" | "relationship" | "character" | "field"; ids: string[] }) {
  const [docs, setDocs] = useState<Record<string, TagDoc>>({});
  const coll = useMemo(() => collection(db, `picker_${category}`), [category]);

  useEffect(() => {
    (async () => {
      if (!ids || ids.length === 0) { setDocs({}); return; }
      // batch by chunks of up to 10 for 'in' query
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) batches.push(ids.slice(i, i + 10));
      const out: Record<string, TagDoc> = {};
      for (const chunk of batches) {
        const q = query(coll, where(documentId(), 'in', chunk as any));
        const snap = await getDocs(q);
        snap.forEach((d) => { out[d.id] = d.data() as TagDoc; });
      }
      setDocs(out);
    })();
  }, [coll, JSON.stringify(ids)]);

  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const t = docs[id];
        const bg = t?.color ?? '#eef';
        const tc = t?.text_color === 'light' ? '#fff' : '#111827';
        const label = t?.name ?? id;
        return (
          <span key={id} className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: bg, color: tc }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}


