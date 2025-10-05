"use client";
import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

type Option = { value: string; label: string };

export function EntityPicker({
  value,
  onChange,
  queryOwnerId,
  excludeIds = [],
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  queryOwnerId?: string; // optional owner scope
  excludeIds?: string[];
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const coll = useMemo(() => collection(db, "entities"), []);

  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;
    const unsubs: Array<() => void> = [];

    // Merge owned + shared results to satisfy rules and avoid unrestricted collection query
    let owned: Option[] = [];
    let shared: Option[] = [];
    const update = () => {
      const byId: Record<string, Option> = Object.create(null);
      for (const o of owned) byId[o.value] = o;
      for (const o of shared) byId[o.value] = o;
      const merged = Object.values(byId).filter((o) => !excludeIds.includes(o.value));
      setOptions(merged);
    };

    if (queryOwnerId) {
      const qOwned = query(coll, where("owner_id", "==", queryOwnerId), orderBy("created_at", "desc"), limit(50));
      unsubs.push(
        onSnapshot(
          qOwned,
          (snap) => {
            owned = snap.docs.map((d) => {
              const data = d.data() as { name?: unknown };
              const label = typeof data.name === 'string' ? data.name : d.id;
              return { value: d.id, label };
            });
            shared = [];
            update();
          },
          () => {}
        )
      );
    } else if (uid) {
      const qOwned = query(coll, where("owner_id", "==", uid), orderBy("created_at", "desc"), limit(50));
      const qShared = query(coll, where("viewer_ids", "array-contains", uid), orderBy("created_at", "desc"), limit(50));
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
      setOptions([]);
    }

    return () => unsubs.forEach((u) => u());
  }, [coll, queryOwnerId, excludeIds]);

  return (
    <Select
      isMulti
      options={options}
      value={options.filter((o) => value.includes(o.value))}
      onChange={(vals) => onChange(vals.map((v) => v.value))}
      placeholder="בחר ישויות"
      classNamePrefix="rs"
      styles={{ menu: (s) => ({ ...s, zIndex: 50 }) }}
    />
  );
}
