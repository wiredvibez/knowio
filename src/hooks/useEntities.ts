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
  documentId,
  Query,
} from "firebase/firestore";
import type { EntityDoc } from "@/types/firestore";
import type { TagFilters } from "@/components/network/network-header";

export function useEntities({ types, filters, search }: { types: string[]; filters: TagFilters; search?: string }) {
  const uid = auth.currentUser?.uid;
  const [rows, setRows] = useState<(EntityDoc & { id: string })[]>([]);
  const lastOwnedRef = useRef<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const lastSharedRef = useRef<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const coll = useMemo(() => collection(db, "entities"), []);

  // dependencies are stable state/props; include directly per lint rule

  useEffect(() => {
    if (!uid) {
      setRows([]);
      setLoading(false);
      setInitializing(false);
      return;
    }

    const qText = (search || "").trim().toLowerCase();
    const searchActive = qText.length > 0;

    // Audience selection semantics (PLAN):
    // - Default (no chips): include owned OR shared
    // - Only "shared" chip: shared only
    // - Type chips only: owned only of those types
    // - Type chips + "shared": owned OR shared, restricted by the types
    const typeVals = types.filter((t) => t !== "shared");
    const sharedOnly = types.includes("shared");
    const includeShared = !sharedOnly; // default: include owned+shared unless explicitly shared-only
    const firstCat = (Object.keys(filters) as (keyof TagFilters)[]).find((k) => filters[k].length > 0);

    // Helper: normalize + sort + client filters
    function normalizeAndFilter(input: (EntityDoc & { id: string })[]): (EntityDoc & { id: string })[] {
      const merged = input.filter((e) => {
        for (const cat of ["from", "relationship", "character", "field"] as const) {
          const sel = filters[cat] as string[];
          if (sel.length === 0) continue;
          const vals: string[] = (e[cat] ?? []) as string[];
          if (!sel.some((s) => vals.includes(s))) return false;
        }
        return true;
      });
      return merged
        .map((e) => ({ ...e, name: (e.name ?? "").toString() }))
        .sort((a, b) => {
          const ad = (a.created_at as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const bd = (b.created_at as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return bd - ad;
        });
    }

    // If search is active, fetch all associated entities and filter client-side by name, info, and tag names
    if (searchActive) {
      setLoading(true);
      setInitializing(true);
      let cancelled = false;
      (async () => {
        const typeConstraint: QueryConstraint[] = typeVals.length > 0 ? [where("type", "in", typeVals.slice(0, 10))] : [];

        async function fetchAll(qBase: Query<DocumentData>): Promise<(EntityDoc & { id: string })[]> {
          const out: (EntityDoc & { id: string })[] = [];
          let last: QueryDocumentSnapshot<DocumentData, DocumentData> | null = null;
          // page in chunks to avoid timeouts
          for (;;) {
            let qPage: Query<DocumentData>;
            if (last) {
              qPage = query(qBase, startAfter(last), limit(200));
            } else {
              qPage = query(qBase, limit(200));
            }
            const snap = await getDocs(qPage);
            if (snap.empty) break;
            out.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
            last = snap.docs[snap.docs.length - 1];
            if (snap.size < 200) break;
          }
          return out;
        }

        const ownedBase = query(coll, where("owner_id", "==", uid), ...typeConstraint, orderBy("created_at", "desc"));
        const sharedBase = includeShared ? query(coll, where("viewer_ids", "array-contains", uid), ...typeConstraint, orderBy("created_at", "desc")) : null;

        const [ownedAll, sharedAll] = await Promise.all([
          fetchAll(ownedBase),
          sharedBase ? fetchAll(sharedBase) : Promise.resolve<(EntityDoc & { id: string })[]>([]),
        ]);

        if (cancelled) return;

        // Build tag name maps
        const tagIdsByCat: Record<"from" | "relationship" | "character" | "field", Set<string>> = {
          from: new Set(), relationship: new Set(), character: new Set(), field: new Set(),
        };
        for (const e of [...ownedAll, ...sharedAll]) {
          (Object.keys(tagIdsByCat) as (keyof typeof tagIdsByCat)[]).forEach((cat) => {
            const arr = (e as unknown as Record<string, unknown>)[cat] as unknown;
            if (Array.isArray(arr)) {
              for (const id of arr as string[]) tagIdsByCat[cat].add(id);
            }
          });
        }

        async function loadTagNames(category: keyof typeof tagIdsByCat): Promise<Record<string, { name: string }>> {
          const out: Record<string, { name: string }> = {};
          const ids = Array.from(tagIdsByCat[category]);
          if (ids.length === 0) return out;
          const collTags = collection(db, `picker_${category}`);
          for (let i = 0; i < ids.length; i += 10) {
            const chunk = ids.slice(i, i + 10);
            const q = query(collTags, where(documentId(), "in", chunk as string[]));
            const snap = await getDocs(q);
            snap.forEach((d) => { const data = d.data() as { name?: unknown }; out[d.id] = { name: ((data?.name ?? "") as string).toString() }; });
          }
          return out;
        }

        const [fromNames, relationshipNames, characterNames, fieldNames] = await Promise.all([
          loadTagNames("from"), loadTagNames("relationship"), loadTagNames("character"), loadTagNames("field"),
        ]);

        if (cancelled) return;

        function entityMatches(e: EntityDoc): boolean {
          const name = (e.name || "").toString().toLowerCase();
          const info = (e.info || "").toString().toLowerCase();
          if (name.includes(qText) || info.includes(qText)) return true;
          for (const cat of ["from", "relationship", "character", "field"] as const) {
            const ids = ((e as unknown as Record<string, unknown>)[cat] ?? []) as string[];
            for (const id of ids) {
              const nm = (cat === "from" ? fromNames[id]
                : cat === "relationship" ? relationshipNames[id]
                : cat === "character" ? characterNames[id]
                : fieldNames[id])?.name?.toLowerCase();
              if (nm && nm.includes(qText)) return true;
            }
          }
          return false;
        }

        const byId: Record<string, EntityDoc & { id: string }> = Object.create(null);
        const base = sharedOnly ? sharedAll : includeShared ? [...ownedAll, ...sharedAll] : ownedAll;
        for (const e of base) {
          const id = (e as unknown as { id?: string }).id;
          if (id && entityMatches(e)) byId[id] = { ...(e as EntityDoc), id } as EntityDoc & { id: string };
        }
        const normalized = normalizeAndFilter(Object.values(byId));
        if (!cancelled) setRows(normalized);
        if (!cancelled) setLoading(false);
        if (!cancelled) setInitializing(false);
      })();
      return () => { cancelled = true; setLoading(false); setInitializing(false); };
    }

    // Default realtime mode (no search): subscribe and paginate as before
    let ownedBatch: (EntityDoc & { id: string })[] = [];
    let sharedBatch: (EntityDoc & { id: string })[] = [];
    setInitializing(true);

    function applyClientFiltersAndSet() {
      const union = includeShared ? [...ownedBatch, ...sharedBatch] : sharedOnly ? sharedBatch : ownedBatch;
      const byId: Record<string, EntityDoc & { id: string }> = Object.create(null);
      for (const r of union) byId[r.id] = r;
      const normalized = normalizeAndFilter(Object.values(byId));
      setRows(normalized);
    }

    const unsubscribers: Array<() => void> = [];
    lastOwnedRef.current = null;
    lastSharedRef.current = null;

    // Track initial snapshot completion
    let pendingInitial = 0;
    let ownedSeen = false;
    let sharedSeen = false;

    // Build constraints separately to avoid combining array-contains on viewer_ids with array-contains-any on tags
    const typeConstraint: QueryConstraint[] = typeVals.length > 0 ? [where("type", "in", typeVals.slice(0, 10))] : [];
    const tagConstraint: QueryConstraint[] = firstCat ? [where(firstCat as string, "array-contains-any", filters[firstCat].slice(0, 10))] : [];

    if (sharedOnly) {
      pendingInitial = 1;
      const qShared = query(coll, where("viewer_ids", "array-contains", uid), ...typeConstraint, orderBy("created_at", "desc"), limit(20));
      unsubscribers.push(
        onSnapshot(
          qShared,
          (snap) => {
            sharedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
            lastSharedRef.current = snap.docs[snap.docs.length - 1] ?? null;
            applyClientFiltersAndSet();
            if (!sharedSeen) { sharedSeen = true; pendingInitial--; if (pendingInitial <= 0) setInitializing(false); }
          },
          (err) => {
            console.warn("shared entities snapshot error", err.code);
          }
        )
      );
    } else if (includeShared) {
      pendingInitial = 2;
      const qOwned = query(coll, where("owner_id", "==", uid), ...typeConstraint, ...tagConstraint, orderBy("created_at", "desc"), limit(20));
      const qShared = query(coll, where("viewer_ids", "array-contains", uid), ...typeConstraint, orderBy("created_at", "desc"), limit(20));
      unsubscribers.push(
        onSnapshot(
          qOwned,
          (snap) => {
            ownedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
            lastOwnedRef.current = snap.docs[snap.docs.length - 1] ?? null;
            applyClientFiltersAndSet();
            if (!ownedSeen) { ownedSeen = true; pendingInitial--; if (pendingInitial <= 0) setInitializing(false); }
          },
          (err) => {
            console.warn("owned entities snapshot error", err.code);
          }
        )
      );
      unsubscribers.push(
        onSnapshot(
          qShared,
          (snap) => {
            sharedBatch = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) }));
            lastSharedRef.current = snap.docs[snap.docs.length - 1] ?? null;
            applyClientFiltersAndSet();
            if (!sharedSeen) { sharedSeen = true; pendingInitial--; if (pendingInitial <= 0) setInitializing(false); }
          },
          (err) => {
            console.warn("shared entities snapshot error", err.code);
          }
        )
      );
    }

    return () => {
      unsubscribers.forEach((u) => u());
      setInitializing(false);
    };
  }, [uid, coll, types, filters, search]);

  async function loadMore() {
    if (!uid) return;
    if ((search || "").trim()) return; // search mode loads all; skip pagination
    if (loadingMore) return;

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
        limit(20)
      );
      setLoadingMore(true);
      const snapShared = await getDocs(qShared).finally(() => setLoadingMore(false));
      if (!snapShared.empty) {
        lastSharedRef.current = snapShared.docs[snapShared.docs.length - 1];
        batches.push(snapShared.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
      }
    } else if (includeShared) {
      if (!lastOwnedRef.current && !lastSharedRef.current) return;
      const promises: Promise<void>[] = [];
      if (lastOwnedRef.current) {
        const qOwned = query(
          coll,
          where("owner_id", "==", uid),
          ...typeConstraint,
          ...tagConstraint,
          orderBy("created_at", "desc"),
          startAfter(lastOwnedRef.current),
          limit(20)
        );
        promises.push(
          (async () => {
            setLoadingMore(true);
            const snap = await getDocs(qOwned).finally(() => setLoadingMore(false));
            if (!snap.empty) {
              lastOwnedRef.current = snap.docs[snap.docs.length - 1];
              batches.push(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
            }
          })()
        );
      }
      if (lastSharedRef.current) {
        const qShared = query(
          coll,
          where("viewer_ids", "array-contains", uid),
          ...typeConstraint,
          orderBy("created_at", "desc"),
          startAfter(lastSharedRef.current),
          limit(20)
        );
        promises.push(
          (async () => {
            setLoadingMore(true);
            const snap = await getDocs(qShared).finally(() => setLoadingMore(false));
            if (!snap.empty) {
              lastSharedRef.current = snap.docs[snap.docs.length - 1];
              batches.push(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
            }
          })()
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
        const ad = (a.created_at as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const bd = (b.created_at as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return bd - ad;
      });
    });
  }

  return { rows, loadMore, loadingMore, loading, initializing };
}


