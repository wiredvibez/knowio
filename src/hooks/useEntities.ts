"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import type { EntityDoc } from "@/types/firestore";
import type { TagFilters } from "@/components/network/network-header";

export function useEntities({ types, filters }: { types: string[]; filters: TagFilters }) {
  const uid = auth.currentUser?.uid;
  const [rows, setRows] = useState<(EntityDoc & { id: string })[]>([]);
  const lastOwnedRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastSharedRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const coll = useMemo(() => collection(db, "entities"), []);

  // dependencies are stable state/props; include directly per lint rule

  useEffect(() => {
    if (!uid) return;

    // Audience selection semantics (PLAN):
    // - Default (no chips): include owned OR shared
    // - Only "shared" chip: shared only
    // - Type chips only: owned only of those types
    // - Type chips + "shared": owned OR shared, restricted by the types
    const typeVals = types.filter((t) => t !== "shared");
    const sharedOnly = types.includes("shared");
    const includeShared = !sharedOnly; // default: include owned+shared unless explicitly shared-only

    const firstCat = (Object.keys(filters) as (keyof TagFilters)[]).find((k) => filters[k].length > 0);

    let ownedBatch: (EntityDoc & { id: string })[] = [];
    let sharedBatch: (EntityDoc & { id: string })[] = [];

    function applyClientFiltersAndSet() {
      const union = includeShared ? [...ownedBatch, ...sharedBatch] : sharedOnly ? sharedBatch : ownedBatch;
      const byId: Record<string, EntityDoc & { id: string }> = Object.create(null);
      for (const r of union) byId[r.id] = r;
      const merged = Object.values(byId).filter((e) => {
        for (const cat of ["from", "relationship", "character", "field"] as const) {
          const sel = filters[cat] as string[];
          if (sel.length === 0) continue;
          const vals: string[] = (e[cat] ?? []) as string[];
          if (!sel.some((s) => vals.includes(s))) return false;
        }
        return true;
      });
      const normalized = merged
        .map((e) => ({ ...e, name: (e.name ?? "").toString() }))
        .sort((a, b) => {
          const ad = (a.created_at as any)?.toMillis?.() ?? 0;
          const bd = (b.created_at as any)?.toMillis?.() ?? 0;
          return bd - ad;
        });
      setRows(normalized);
    }

    const unsubscribers: Array<() => void> = [];
    lastOwnedRef.current = null;
    lastSharedRef.current = null;

    // Build constraints separately to avoid combining array-contains on viewer_ids with array-contains-any on tags
    const typeConstraint: QueryConstraint[] = typeVals.length > 0 ? [where("type", "in", typeVals.slice(0, 10))] : [];
    const tagConstraint: QueryConstraint[] = firstCat ? [where(firstCat as string, "array-contains-any", filters[firstCat].slice(0, 10))] : [];

    if (sharedOnly) {
      // Shared: cannot combine viewer_ids array-contains with any other array-contains/any; apply tags client-side
      const qShared = query(coll, where("viewer_ids", "array-contains", uid), ...typeConstraint, orderBy("created_at", "desc"), limit(50));
      unsubscribers.push(
        onSnapshot(qShared, (snap) => {
          sharedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
          lastSharedRef.current = snap.docs[snap.docs.length - 1] ?? null;
          applyClientFiltersAndSet();
        })
      );
    } else if (includeShared) {
      // Owned can include tagConstraint server-side; Shared must not
      const qOwned = query(coll, where("owner_id", "==", uid), ...typeConstraint, ...tagConstraint, orderBy("created_at", "desc"), limit(50));
      const qShared = query(coll, where("viewer_ids", "array-contains", uid), ...typeConstraint, orderBy("created_at", "desc"), limit(50));
      unsubscribers.push(
        onSnapshot(qOwned, (snap) => {
          ownedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
          lastOwnedRef.current = snap.docs[snap.docs.length - 1] ?? null;
          applyClientFiltersAndSet();
        })
      );
      unsubscribers.push(
        onSnapshot(qShared, (snap) => {
          sharedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
          lastSharedRef.current = snap.docs[snap.docs.length - 1] ?? null;
          applyClientFiltersAndSet();
        })
      );
    }

    return () => unsubscribers.forEach((u) => u());
  }, [uid, coll, types, filters]);

  async function loadMore() {
    if (!uid) return;

    const typeVals = types.filter((t) => t !== "shared");
    const sharedOnly = types.includes("shared");
    const includeShared = !sharedOnly; // default: include owned+shared unless explicitly shared-only
    const firstCat = (Object.keys(filters) as (keyof TagFilters)[]).find((k) => filters[k].length > 0);

    const typeConstraint: QueryConstraint[] = typeVals.length > 0 ? [where("type", "in", typeVals.slice(0, 10))] : [];
    const tagConstraint: QueryConstraint[] = firstCat ? [where(firstCat as string, "array-contains-any", filters[firstCat].slice(0, 10))] : [];

    const batches: (EntityDoc & { id: string })[][] = [];

    if (sharedOnly) {
      if (!lastSharedRef.current) return;
      const qShared = query(
        coll,
        where("viewer_ids", "array-contains", uid),
        ...typeConstraint,
        orderBy("created_at", "desc"),
        startAfter(lastSharedRef.current),
        limit(50)
      );
      const snapShared = await getDocs(qShared);
      if (!snapShared.empty) {
        lastSharedRef.current = snapShared.docs[snapShared.docs.length - 1];
        batches.push(snapShared.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
      }
    } else if (includeShared) {
      const promises: Promise<void>[] = [];
      if (lastOwnedRef.current) {
        const qOwned = query(
          coll,
          where("owner_id", "==", uid),
          ...typeConstraint,
          ...tagConstraint,
          orderBy("created_at", "desc"),
          startAfter(lastOwnedRef.current),
          limit(50)
        );
        promises.push(
          getDocs(qOwned).then((snap) => {
            if (!snap.empty) {
              lastOwnedRef.current = snap.docs[snap.docs.length - 1];
              batches.push(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
            }
          })
        );
      }
      if (lastSharedRef.current) {
        const qShared = query(
          coll,
          where("viewer_ids", "array-contains", uid),
          ...typeConstraint,
          orderBy("created_at", "desc"),
          startAfter(lastSharedRef.current),
          limit(50)
        );
        promises.push(
          getDocs(qShared).then((snap) => {
            if (!snap.empty) {
              lastSharedRef.current = snap.docs[snap.docs.length - 1];
              batches.push(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
            }
          })
        );
      }
      await Promise.all(promises);
    }

    if (batches.length === 0) return;
    const appended = batches.flat();
    const filtered = appended.filter((e) => {
      for (const cat of ["from", "relationship", "character", "field"] as const) {
        const sel = filters[cat] as string[];
        if (sel.length === 0) continue;
        const vals: string[] = (e[cat] ?? []) as string[];
        if (!sel.some((s) => vals.includes(s))) return false;
      }
      return true;
    });
    const normalized = filtered.map((e) => ({ ...e, name: (e.name ?? "").toString() }));
    setRows((prev) => {
      const byId: Record<string, EntityDoc & { id: string }> = Object.create(null);
      for (const r of prev) byId[r.id] = r;
      for (const r of normalized) byId[r.id] = r;
      return Object.values(byId).sort((a, b) => {
        const ad = (a.created_at as any)?.toMillis?.() ?? 0;
        const bd = (b.created_at as any)?.toMillis?.() ?? 0;
        return bd - ad;
      });
    });
  }

  return { rows, loadMore };
}


