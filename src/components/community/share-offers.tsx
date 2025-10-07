"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { fetchUserNames } from "@/lib/names";
import type { Timestamp } from "firebase/firestore";

type Offer = { id: string; sender_id: string; recipient_id: string; entity_ids: string[]; confirmed: boolean; created_at?: Timestamp };

export function ShareOffers() {
  const uid = auth.currentUser?.uid;
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  // entityNames not needed for current UI (we show counts only)

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "shares"), where("recipient_id", "==", uid), where("confirmed", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ ...(d.data() as Omit<Offer, 'id'>), id: d.id })) as Offer[];
      setOffers(rows);
      const senders = rows.map((r) => r.sender_id);
      if (senders.length === 0) { setUserNames({}); return; }
      const t0 = performance.now();
      fetchUserNames(senders).then((m) => {
        setUserNames(m);
      });
    });
    return () => unsub();
  }, [uid]);

  async function accept(id: string) {
    await updateDoc(doc(db, "shares", id), { confirmed: true });
  }
  async function decline(id: string) {
    await deleteDoc(doc(db, "shares", id));
  }

  if (offers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold">הצעות שיתוף</h2>
      {offers.map((o) => (
        <div key={o.id} className="rounded border p-2 text-sm flex items-center justify-between">
          <div>
            <div>מאת: <span className="font-medium">{userNames[o.sender_id] ?? o.sender_id}</span></div>
            <div className="text-xs text-muted-foreground">{o.entity_ids?.length ?? 0} ישויות</div>
          </div>
          <div className="flex gap-2">
            <button className="px-2 py-1 rounded border" onClick={() => decline(o.id)}>דחה</button>
            <button className="px-2 py-1 rounded bg-foreground text-background" onClick={() => accept(o.id)}>אשר</button>
          </div>
        </div>
      ))}
    </div>
  );
}


