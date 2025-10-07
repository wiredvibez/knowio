"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, limit, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { InteractionTypePicker } from "@/components/pickers/interaction-type-picker";
import { RelationsPicker } from "@/components/pickers/relations-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Row = { id: string; type: string; date: unknown; entity_refs: string[]; notes?: string; interactor_uid: string };

export function Interactions({ entityId, readonly = false, selfId, selfName }: { entityId: string; readonly?: boolean; selfId?: string; selfName?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editor, setEditor] = useState<null | { id: string }>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const pressMs = 600;
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!auth.currentUser) return; // wait for auth to be available
    const uid = auth.currentUser.uid;
    const coll = collection(db, "interactions");
    // Rules require owner-only read; also order by date and limit for efficiency
    const q = query(coll, where("owner_id", "==", uid), orderBy("date", "desc"), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
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
      },
      (err) => {
        console.warn("interactions snapshot error", err.code);
      }
    );
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
      const out: Record<string, string> = {};
      // Use per-doc reads to comply with security rules when some entities are not shared
      await Promise.all(
        ids.map(async (id) => {
          try {
            const d = await getDoc(doc(db, "entities", id));
            if (d.exists()) {
              const data = d.data() as { name?: unknown };
              out[id] = typeof data.name === 'string' ? data.name : id;
            }
          } catch {
            // ignore permission errors for unrelated entities
          }
        })
      );
      setEntityNames((prev) => ({ ...prev, ...out }));
    })();
  }, [rows, entityId, entityNames, selfId, selfName]);

  function startPress(rowId: string) {
    if (timer) window.clearTimeout(timer);
    const t = window.setTimeout(() => setEditor({ id: rowId }), pressMs);
    setTimer(t);
  }
  function cancelPress() {
    if (timer) window.clearTimeout(timer);
    setTimer(null);
  }

  function toDateInputString(d: unknown): string {
    type HasToDate = { toDate: () => Date };
    const hasToDate = (v: unknown): v is HasToDate => !!v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>) && typeof (v as HasToDate).toDate === 'function';
    const asDate = hasToDate(d) ? d.toDate() : d instanceof Date ? d : undefined;
    const date = asDate ?? new Date(0);
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }

  return (
    <div className="space-y-4">
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
                {groups[k].map((r) => {
                  const otherIds = (selfId ? r.entity_refs.filter((id) => id !== selfId) : r.entity_refs);
                  const initial = {
                    id: r.id,
                    type: r.type,
                    dateStr: toDateInputString(r.date),
                    notes: r.notes ?? "",
                    otherEntityIds: otherIds ?? [],
                  } as const;
                  return (
                    <Popover key={r.id} open={editor?.id === r.id} onOpenChange={(v) => { if (!v) setEditor(null); }}>
                      <PopoverTrigger asChild>
                        <div
                          className="p-2 hover:bg-muted/30"
                          onContextMenu={(e) => { if (!readonly) { e.preventDefault(); setEditor({ id: r.id }); } }}
                          onPointerDown={() => { if (!readonly) startPress(r.id); }}
                          onPointerUp={cancelPress}
                          onPointerLeave={cancelPress}
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-medium text-sm">{r.type}</div>
                          </div>
                          {(r.entity_refs.length > 1) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.entity_refs.map((id) => (
                                <span key={id} className="text-[11px] rounded px-1.5 py-0.5 bg-muted">{entityNames[id] ?? id}</span>
                              ))}
                            </div>
                          )}
                          {r.notes && (
                            <div className="mt-1 text-sm text-muted-foreground">{r.notes}</div>
                          )}
                        </div>
                      </PopoverTrigger>
                      {!readonly && (
                        <PopoverContent align="end" side="bottom" className="w-[480px] p-3">
                          <NewInteractionForm
                            selfId={selfId}
                            selfName={selfName}
                            initial={initial}
                            onCancel={() => setEditor(null)}
                            onCreated={() => setEditor(null)}
                            onDeleted={() => setEditor(null)}
                          />
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

export function NewInteractionForm({ selfId, selfName, initial, onCreated, onDeleted, onCancel }: { selfId?: string; selfName?: string; initial?: { id: string; type: string; dateStr: string; notes: string; otherEntityIds: string[] }; onCreated?: () => void; onDeleted?: () => void; onCancel?: () => void }) {
  const [type, setType] = useState<string | undefined>();
  const [entities, setEntities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [dateStr, setDateStr] = useState<string>("");
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});

  // Initialize from existing interaction when provided
  useEffect(() => {
    if (!initial) return;
    setType(initial.type);
    setEntities(initial.otherEntityIds ?? []);
    setNotes(initial.notes ?? "");
    setDateStr(initial.dateStr ?? "");
  }, [initial?.id]);

  // Resolve names for selected participants
  useEffect(() => {
    (async () => {
      const ids = entities.filter((id) => id && !participantNames[id]);
      if (ids.length === 0) return;
      const out: Record<string, string> = {};
      await Promise.all(ids.map(async (id) => {
        try {
          const d = await getDoc(doc(db, "entities", id));
          if (d.exists()) {
            const data = d.data() as { name?: unknown };
            out[id] = typeof data.name === 'string' ? data.name : id;
          }
        } catch {
          // ignore permission errors
        }
      }));
      setParticipantNames((prev) => ({ ...prev, ...out }));
    })();
  }, [entities, participantNames]);

  function isPastDateString(value: string): boolean {
    if (!value) return true;
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
    if (!selfId && entities.length === 0) {
      alert("בחר לפחות ישות אחת");
      return;
    }
    const refs = Array.from(new Set([selfId, ...entities].filter(Boolean)));
    if (initial?.id) {
      await updateDoc(doc(db, "interactions", initial.id), {
        type,
        entity_refs: refs,
        date: dateStr ? new Date(dateStr) : serverTimestamp(),
        notes,
      });
    } else {
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
    }
    setType(undefined);
    setEntities([]);
    setNotes("");
    setDateStr("");
    onCreated?.();
  }

  async function deleteInteraction() {
    if (!initial?.id) return;
    try {
      await deleteDoc(doc(db, "interactions", initial.id));
      onDeleted?.();
    } catch {
      // noop
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-muted-foreground">סוג אינטראקציה</div>
          <InteractionTypePicker value={type} onChange={setType} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-muted-foreground">משתתפים</div>
          {selfId && (
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="text-[12px] rounded-full border px-2 py-0.5 bg-muted">{selfName ?? selfId}</span>
              <span className="text-[10px] text-muted-foreground">(קבוע)</span>
            </div>
          )}
          {entities.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {entities.map((id) => (
                <div key={id} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
                  <span>{participantNames[id] ?? id}</span>
                  <button
                    className="text-[10px] opacity-70 hover:opacity-100"
                    title="הסר"
                    onClick={() => setEntities((prev) => prev.filter((x) => x !== id))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">+</Button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-[520px] max-w-[calc(100vw-1rem)] p-0">
              <RelationsPicker
                value={entities}
                onChange={setEntities}
                excludeIds={selfId ? [selfId] : []}
              />
            </PopoverContent>
          </Popover>
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
      <div className="flex justify-between gap-2">
        {initial?.id ? (
          <button className="px-3 py-1.5 rounded border border-red-500 text-red-600" onClick={deleteInteraction}>מחק</button>
        ) : <span />}
        <button className="px-3 py-1.5 rounded border" onClick={() => { setType(undefined); setEntities([]); setNotes(""); setDateStr(""); onCancel?.(); }}>בטל</button>
        <button
          className="px-3 py-1.5 rounded bg-foreground text-background disabled:opacity-50"
          onClick={createInteraction}
          disabled={!type || (!!dateStr && !isPastDateString(dateStr)) || (!selfId && entities.length === 0)}
        >
          שמור
        </button>
      </div>
    </div>
  );
}


