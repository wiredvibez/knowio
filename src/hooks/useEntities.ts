"use client";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  QueryConstraint,
} from "firebase/firestore";
import type { EntityDoc } from "@/types/firestore";
import type { TagFilters } from "@/components/network/network-header";

export function useEntities({ types, filters }: { types: string[]; filters: TagFilters }) {
  const uid = auth.currentUser?.uid;
  const [rows, setRows] = useState<(EntityDoc & { id: string })[]>([]);
  const coll = useMemo(() => collection(db, "entities"), []);

  useEffect(() => {
    if (!uid) return;
    const constraints: QueryConstraint[] = [];

    // Shared-only vs owner-only (MVP behavior)
    const sharedOnly = types.includes("shared") && types.filter((t) => t !== "shared").length === 0;
    if (sharedOnly) {
      constraints.push(where("viewer_ids", "array-contains", uid));
    } else {
      constraints.push(where("owner_id", "==", uid));
    }

    const typeVals = types.filter((t) => t !== "shared");
    if (typeVals.length > 0) {
      constraints.push(where("type", "in", typeVals.slice(0, 10)));
    }

    // Only one array-contains-any allowed in Firestore; pick first non-empty category for server filter
    const firstCat = (Object.keys(filters) as (keyof TagFilters)[]).find((k) => filters[k].length > 0);
    if (firstCat) {
      constraints.push(where(firstCat as string, "array-contains-any", filters[firstCat].slice(0, 10)));
    }

    const q = query(coll, ...constraints, orderBy("created_at", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      // Client-side compounding for remaining categories (if any)
      const filtered = data.filter((e) => {
        for (const cat of ["from", "relationship", "character", "field"] as const) {
          const sel = (filters as any)[cat] as string[];
          if (sel.length === 0) continue;
          if (cat === firstCat) continue; // already filtered on server
          const vals: string[] = (e[cat] ?? []) as string[];
          if (!sel.some((s) => vals.includes(s))) return false;
        }
        return true;
      });
      setRows(filtered as any);
    });
    return () => unsub();
  }, [uid, coll, JSON.stringify(types), JSON.stringify(filters)]);

  return { rows };
}


