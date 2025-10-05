"use client";
import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
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
          (err) => {
            console.warn("relations owned snapshot error", err.code);
          }
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
          (err) => {
            console.warn("relations shared snapshot error", err.code);
          }
        )
      );
    } else {
      // No uid yet; clear options
      setOptions([]);
    }

    return () => unsubs.forEach((u) => u());
  }, [coll, queryOwnerId, excludeKey, excludeIds]);

  if (multiple) {
    return (
      <Select
        isMulti
        options={options}
        value={options.filter((o) => value.includes(o.value))}
        onChange={(vals) => onChange(vals.map((v) => v.value))}
        placeholder="בחר קשרים"
        classNamePrefix="rs"
        styles={{ menu: (s) => ({ ...s, zIndex: 50 }) }}
        isDisabled={readonly}
      />
    );
  }

  const selected = options.find((o) => value[0] === o.value) ?? null;
  return (
    <Select
      options={options}
      value={selected}
      onChange={(val) => onChange(val ? [val.value] : [])}
      placeholder="בחר קשר"
      classNamePrefix="rs"
      styles={{ menu: (s) => ({ ...s, zIndex: 50 }) }}
      isDisabled={readonly}
    />
  );
}
