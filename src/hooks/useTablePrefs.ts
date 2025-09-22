"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export function useTablePrefs() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      const hp = snap.data()?.table_prefs?.hidden_columns as string[] | undefined;
      const co = snap.data()?.table_prefs?.column_order as string[] | undefined;
      setHidden(hp ?? []);
      setOrder(co ?? []);
    });
    return () => unsub();
  }, []);

  async function saveHidden(next: string[]) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(db, "users", uid), { table_prefs: { hidden_columns: next } }, { merge: true });
  }

  async function saveOrder(next: string[]) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(db, "users", uid), { table_prefs: { column_order: next } }, { merge: true });
  }

  return { hidden, order, saveHidden, saveOrder };
}


