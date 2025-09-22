"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { BitDoc } from "@/types/firestore";

export function useBits(entityId?: string) {
  const [bits, setBits] = useState<(BitDoc & { id: string })[]>([]);

  useEffect(() => {
    if (!entityId) return;
    const coll = collection(db, "entities", entityId, "bits");
    const unsub = onSnapshot(query(coll, orderBy("created_at", "desc")), (snap) => {
      setBits(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [entityId]);

  async function post(text: string) {
    if (!entityId || !auth.currentUser) return;
    await addDoc(collection(db, "entities", entityId, "bits"), {
      text,
      author_id: auth.currentUser.uid,
      created_at: serverTimestamp(),
      show_author: true,
    });
  }

  return { bits, post };
}


