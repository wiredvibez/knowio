"use client";
import Select from "react-select/creatable";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

type Option = { value: string; label: string };

export function InteractionTypePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const [options, setOptions] = useState<Option[]>([]);
  const uid = auth.currentUser?.uid;
  const ref = useMemo(() => (uid ? doc(db, "users", uid) : null), [uid]);

  useEffect(() => {
    if (!ref) return;
    const unsub = onSnapshot(ref, (snap) => {
      const list = (snap.data()?.interaction_types as string[] | undefined) ?? ["call", "meeting", "message", "gift", "other"];
      setOptions(list.map((x) => ({ value: x, label: x })));
    });
    return () => unsub();
  }, [ref]);

  async function createOption(inputValue: string) {
    if (!ref) return;
    const val = inputValue.trim();
    const list = options.map((o) => o.value);
    if (!list.includes(val)) {
      await setDoc(ref, { interaction_types: [...list, val] }, { merge: true });
    }
    onChange(val);
  }

  return (
    <Select
      isClearable
      options={options}
      value={value ? { value, label: value } : null}
      onChange={(opt) => onChange(opt?.value)}
      onCreateOption={createOption}
      placeholder="סוג אינטראקציה"
      classNamePrefix="rs"
      styles={{ menu: (s) => ({ ...s, zIndex: 50 }) }}
    />
  );
}
