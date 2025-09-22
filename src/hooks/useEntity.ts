"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import type { EntityDoc } from "@/types/firestore";

export function useEntity(id?: string) {
  const [entity, setEntity] = useState<(EntityDoc & { id: string }) | null>(null);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "entities", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return setEntity(null);
      setEntity({ id: snap.id, ...(snap.data() as any) });
    });
    return () => unsub();
  }, [id]);

  async function save(fields: Partial<EntityDoc>) {
    if (!id) return;
    await updateDoc(doc(db, "entities", id), fields as any);
  }

  return { entity, save };
}


