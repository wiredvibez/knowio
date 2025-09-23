"use client";
import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

type Option = { value: string; label: string };

export function EntityPicker({
  value,
  onChange,
  queryOwnerId,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  queryOwnerId?: string; // optional owner scope
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const coll = useMemo(() => collection(db, "entities"), []);

  useEffect(() => {
    const q = queryOwnerId
      ? query(coll, where("owner_id", "==", queryOwnerId), orderBy("created_at", "desc"), limit(50))
      : query(coll, orderBy("created_at", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setOptions(snap.docs.map((d) => {
        const data = d.data() as { name?: unknown };
        const label = typeof data.name === 'string' ? data.name : d.id;
        return { value: d.id, label };
      }));
    });
    return () => unsub();
  }, [coll, queryOwnerId]);

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
