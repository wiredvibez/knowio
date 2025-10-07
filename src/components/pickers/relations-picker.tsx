"use client";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

type Option = { value: string; label: string };

export function RelationsPicker({
  value,
  onChange,
  multiple = true,
  queryOwnerId,
  excludeIds = [],
  readonly = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  queryOwnerId?: string;
  excludeIds?: string[];
  readonly?: boolean;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [q, setQ] = useState("");
  const coll = useMemo(() => collection(db, "entities"), []);

  const excludeKey = excludeIds.join(',');
  useEffect(() => {
    const uid = queryOwnerId ?? auth.currentUser?.uid ?? null;
    const unsubs: Array<() => void> = [];

    // Collect options from both owned and shared (viewer_ids) to satisfy rules
    let owned: Option[] = [];
    let shared: Option[] = [];
    const update = () => {
      const byId: Record<string, Option> = Object.create(null);
      for (const o of owned) byId[o.value] = o;
      for (const o of shared) byId[o.value] = o;
      const merged = Object.values(byId).filter((o) => !excludeIds.includes(o.value));
      setOptions(merged);
    };

    if (uid) {
      const qOwned = query(coll, where("owner_id", "==", uid), orderBy("created_at", "desc"), limit(50));
      unsubs.push(
        onSnapshot(
          qOwned,
          (snap) => {
            owned = snap.docs.map((d) => {
              const data = d.data() as { name?: unknown };
              const label = typeof data.name === 'string' ? data.name : d.id;
              return { value: d.id, label };
            });
            update();
          },
          () => {}
        )
      );

      const qShared = query(coll, where("viewer_ids", "array-contains", uid), orderBy("created_at", "desc"), limit(50));
      unsubs.push(
        onSnapshot(
          qShared,
          (snap) => {
            shared = snap.docs.map((d) => {
              const data = d.data() as { name?: unknown };
              const label = typeof data.name === 'string' ? data.name : d.id;
              return { value: d.id, label };
            });
            update();
          },
          () => {}
        )
      );
    } else {
      // No uid yet; clear options
      setOptions([]);
    }

    return () => unsubs.forEach((u) => u());
  }, [coll, queryOwnerId, excludeKey, excludeIds]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q]);

  function toggle(id: string) {
    if (readonly) return;
    if (!multiple) {
      onChange(value[0] === id ? [] : [id]);
      return;
    }
    const next = selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id];
    onChange(next);
  }

  return (
    <div className="w-[480px] max-w-[calc(100vw-1rem)] p-3">
      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש קשרים" />
        <button className="ml-auto text-sm opacity-70" onClick={() => setQ("")}>נקה</button>
      </div>
      <div className="mt-3 max-h-[50vh] overflow-auto flex flex-wrap gap-2">
        {filtered.map((o) => {
          const isSel = selectedSet.has(o.value);
          return (
            <Badge
              key={o.value}
              variant={isSel ? "default" : "outline"}
              className={`cursor-pointer ${isSel ? "" : "bg-transparent"}`}
              onClick={() => toggle(o.value)}
              title={o.label}
            >
              {o.label}
            </Badge>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">אין תוצאות</div>
        )}
      </div>
    </div>
  );
}
