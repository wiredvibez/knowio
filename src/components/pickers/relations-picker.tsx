"use client";
import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
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

  useEffect(() => {
    const q = queryOwnerId
      ? query(coll, where("owner_id", "==", queryOwnerId), orderBy("created_at", "desc"), limit(50))
      : query(coll, orderBy("created_at", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setOptions(
        snap.docs
          .filter((d) => !excludeIds.includes(d.id))
          .map((d) => ({ value: d.id, label: (d.data() as any).name ?? d.id }))
      );
    });
    return () => unsub();
  }, [coll, queryOwnerId, JSON.stringify(excludeIds)]);

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
