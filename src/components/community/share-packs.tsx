"use client";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { fetchUserNames, fetchEntityNames } from "@/lib/names";
import type { Timestamp } from "firebase/firestore";

type Pack = { id: string; sender_id: string; recipient_id: string; entity_ids: string[]; confirmed: boolean; created_at?: Timestamp };

export function SharePacks() {
  const uid = auth.currentUser?.uid;
  const [packs, setPacks] = useState<Pack[]>([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "shares"), where("sender_id", "==", uid));
    const r = query(collection(db, "shares"), where("recipient_id", "==", uid));
    const unsubQ = onSnapshot(q, (snap) => setPacks((prev) => [...prev.filter((p) => p.sender_id !== uid), ...snap.docs.map((d) => ({ ...(d.data() as Omit<Pack, 'id'>), id: d.id }))]));
    const unsubR = onSnapshot(r, (snap) => setPacks((prev) => [...prev.filter((p) => p.recipient_id !== uid), ...snap.docs.map((d) => ({ ...(d.data() as Omit<Pack, 'id'>), id: d.id }))]));
    return () => { unsubQ(); unsubR(); };
  }, [uid]);

  const grouped = packs.reduce<Record<string, { out: Pack[]; in: Pack[] }>>((acc, p) => {
    const friend = p.sender_id === uid ? p.recipient_id : p.sender_id;
    acc[friend] ||= { out: [], in: [] };
    if (p.sender_id === uid) acc[friend].out.push(p); else acc[friend].in.push(p);
    return acc;
  }, {});

  const nameIds = useMemo(() => Object.keys(grouped), [grouped]);
  const entityIds = useMemo(() => Array.from(new Set(packs.flatMap((p) => p.entity_ids || []))), [packs]);
  const [userNames, setUserNames] = useState<Record<string,string>>({});
  const [entityNames, setEntityNames] = useState<Record<string,string>>({});
  useEffect(() => { fetchUserNames(nameIds).then(setUserNames); }, [nameIds]);
  useEffect(() => { fetchEntityNames(entityIds).then(setEntityNames); }, [entityIds]);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([friend, { out, in: incoming }]) => (
        <details key={friend} className="rounded border p-2">
          <summary className="cursor-pointer text-sm flex items-center gap-3">
            <span className="font-medium">{userNames[friend] ?? friend}</span>
            <span className="text-xs">יצא: {out.reduce((n, p) => n + (p.entity_ids?.length || 0), 0)}</span>
            <span className="text-xs">נכנס: {incoming.reduce((n, p) => n + (p.entity_ids?.length || 0), 0)}</span>
          </summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {[...out, ...incoming].map((p) => (
              <div key={p.id} className="border rounded p-2 text-xs">
                <div>חבילה {p.id} ({p.sender_id === uid ? 'יצא' : 'נכנס'})</div>
                <ul className="list-disc pr-5">
                  {(p.entity_ids || []).map((id) => (
                    <li key={id}>{entityNames[id] ?? id}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}


