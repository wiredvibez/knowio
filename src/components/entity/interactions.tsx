"use client";
import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, limit, getDocs, documentId } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { InteractionTypePicker } from "@/components/pickers/interaction-type-picker";
import { EntityPicker } from "@/components/pickers/entity-picker";

type Row = { id: string; type: string; date: unknown; entity_refs: string[]; notes?: string; interactor_uid: string };

export function Interactions({ entityId, readonly = false, openKey, selfId, selfName }: { entityId: string; readonly?: boolean; openKey?: number; selfId?: string; selfName?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [type, setType] = useState<string | undefined>();
  const [entities, setEntities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [dateStr, setDateStr] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

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

  // Resolve names for related entities to display chips
  useEffect(() => {
    (async () => {
      const allIds = new Set<string>();
      for (const r of rows) {
        for (const id of r.entity_refs ?? []) {
          if (id && !entityNames[id]) allIds.add(id);
        }
      }
      if (selfId && selfName && !entityNames[selfId]) {
        setEntityNames((prev) => ({ ...prev, [selfId]: selfName }));
      }
      const ids = Array.from(allIds);
      if (ids.length === 0) return;
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) batches.push(ids.slice(i, i + 10));
      const out: Record<string, string> = {};
      for (const chunk of batches) {
        const snap = await getDocs(query(collection(db, "entities"), where(documentId(), "in", chunk as string[])));
        snap.forEach((d) => {
          const data = d.data() as { name?: unknown };
          out[d.id] = typeof data.name === 'string' ? data.name : d.id;
        });
      }
      setEntityNames((prev) => ({ ...prev, ...out }));
    })();
  }, [rows, entityId, entityNames]);

  // External trigger to open the create form when the key changes
  const lastKeyRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (openKey !== undefined && openKey !== lastKeyRef.current) {
      lastKeyRef.current = openKey;
      setOpen(true);
    }
  }, [openKey]);

  function isPastDateString(value: string): boolean {
    if (!value) return true; // empty means default to now; server will set timestamp
    const picked = new Date(value);
    const today = new Date();
    picked.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return picked.getTime() <= today.getTime();
  }

  async function createInteraction() {
    if (!auth.currentUser || !type) return;
    if (!isPastDateString(dateStr)) {
      alert("תאריך עתידי אינו מותר");
      return;
    }
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
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      {!readonly && open && (
          <div className="rounded-lg border p-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">סוג אינטראקציה</div>
              <InteractionTypePicker value={type} onChange={setType} />
            </div>
              <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">ישויות נוספות</div>
                <EntityPicker value={entities} onChange={setEntities} excludeIds={[entityId]} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">תאריך</div>
              <input
                type="date"
                className="border rounded px-2 py-1 h-9 w-full"
                value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  max={new Date().toISOString().slice(0,10)}
              />
            </div>
          </div>
            <div className="flex items-center gap-2">
              <Switch checked disabled />
              <span className="text-xs text-muted-foreground">בוצע מעקב</span>
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
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border" onClick={() => { setOpen(false); setType(undefined); setEntities([]); setNotes(""); setDateStr(""); }}>בטל</button>
            <button
              className="px-3 py-1.5 rounded bg-foreground text-background disabled:opacity-50"
              onClick={createInteraction}
                disabled={!type || (dateStr && !isPastDateString(dateStr))}
            >
              שמור
            </button>
          </div>
          </div>
      )}

      <div className="space-y-2">
        {(() => {
          // group by date (yyyy-mm-dd)
          type HasToDate = { toDate: () => Date };
          const keyOf = (d: unknown) => {
            const hasToDate = (v: unknown): v is HasToDate => !!v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>) && typeof (v as HasToDate).toDate === 'function';
            const asDate = hasToDate(d) ? d.toDate() : d instanceof Date ? d : undefined;
            const date = asDate ?? new Date(0);
            const y = date.getFullYear();
            const m = String(date.getMonth()+1).padStart(2,'0');
            const dd = String(date.getDate()).padStart(2,'0');
            return `${y}-${m}-${dd}`;
          };
          const groups: Record<string, Row[]> = {};
          for (const row of rows) {
            const k = keyOf(row.date);
            (groups[k] ||= []).push(row);
          }
          const orderedKeys = Object.keys(groups).sort((a,b) => (a > b ? -1 : 1));
          return orderedKeys.map((k) => (
            <div key={k} className="py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div>{new Date(k).toLocaleDateString()}</div>
                <div className="h-px bg-border flex-1" />
              </div>
              <div className="mt-1 space-y-2">
                {groups[k].map((r) => (
                  <div key={r.id}>
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{r.type}</div>
                    </div>
                    {(r.entity_refs.length > 1) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {/* include self too when more than one involved */}
                        {r.entity_refs.map((id) => (
                          <span key={id} className="text-[11px] rounded px-1.5 py-0.5 bg-muted">{entityNames[id] ?? id}</span>
                        ))}
                      </div>
                    )}
                    {r.notes && (
                      <div className="mt-1 text-sm text-muted-foreground">{r.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}


