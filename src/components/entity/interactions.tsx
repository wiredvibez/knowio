"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, limit } from "firebase/firestore";
import { InteractionTypePicker } from "@/components/pickers/interaction-type-picker";
import { EntityPicker } from "@/components/pickers/entity-picker";

type Row = { id: string; type: string; date: unknown; entity_refs: string[]; notes?: string; interactor_uid: string };

export function Interactions({ entityId, readonly = false }: { entityId: string; readonly?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [type, setType] = useState<string | undefined>();
  const [entities, setEntities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    if (!auth.currentUser) return; // wait for auth to be available
    const uid = auth.currentUser.uid;
    const coll = collection(db, "interactions");
    // Rules require owner-only read; also order by date and limit for efficiency
    const q = query(coll, where("owner_id", "==", uid), orderBy("date", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data() as Partial<Row>;
        return {
          id: d.id,
          type: String(raw.type ?? ""),
          date: raw.date as unknown,
          entity_refs: Array.isArray(raw.entity_refs) ? (raw.entity_refs as string[]) : [],
          notes: typeof raw.notes === 'string' ? raw.notes : undefined,
          interactor_uid: String(raw.interactor_uid ?? ""),
        } as Row;
      });
      setRows(data.filter((r) => r.entity_refs?.includes(entityId)));
    });
    return () => unsub();
  }, [entityId]);

  async function createInteraction() {
    if (!auth.currentUser || !type) return;
    const refs = Array.from(new Set([entityId, ...entities].filter(Boolean)));
    await addDoc(collection(db, "interactions"), {
      type,
      entity_refs: refs,
      date: dateStr ? new Date(dateStr) : serverTimestamp(),
      location: {},
      notes,
      catchup_done: true,
      interactor_uid: auth.currentUser.uid,
      owner_id: auth.currentUser.uid,
      created_at: serverTimestamp(),
    });
    setType(undefined);
    setEntities([]);
    setNotes("");
    setDateStr("");
  }

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">סוג אינטראקציה</div>
              <InteractionTypePicker value={type} onChange={setType} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">ישויות נוספות</div>
              <EntityPicker value={entities} onChange={setEntities} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">תאריך</div>
              <input
                type="date"
                className="border rounded px-2 py-1 h-9 w-full"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">תיאור</div>
            <input
              className="border rounded px-2 py-2 w-full"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="מה קרה?"
            />
          </div>
          <div className="flex justify-end">
            <button
              className="px-3 py-1.5 rounded bg-foreground text-background disabled:opacity-50"
              onClick={createInteraction}
              disabled={!type}
            >
              שמור
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.type}</div>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  type HasToDate = { toDate: () => Date };
                  const d = r.date as unknown;
                  const hasToDate = (v: unknown): v is HasToDate => {
                    return !!v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>) && typeof (v as HasToDate).toDate === 'function';
                  };
                  const asDate = hasToDate(d) ? d.toDate() : d instanceof Date ? d : undefined;
                  return asDate ? asDate.toLocaleDateString() : "";
                })()}
              </div>
            </div>
            {r.notes && (
              <div className="mt-1 text-sm text-muted-foreground">{r.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


