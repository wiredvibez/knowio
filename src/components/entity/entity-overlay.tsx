"use client";
import { Dialog } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useEntity } from "@/hooks/useEntity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TagPicker } from "@/components/pickers/tag-picker";
import { RelationsPicker } from "@/components/pickers/relations-picker";
import { TagChips } from "@/components/tags/tag-chips";
import { CATEGORY_LABELS } from "@/constants/tags";
import { Pencil } from "lucide-react";
import { Interactions } from "@/components/entity/interactions";
import { Bits } from "@/components/entity/bits";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

export function EntityOverlay({ open, onOpenChange, entityId }: { open: boolean; onOpenChange: (v: boolean) => void; entityId?: string }) {
  const { entity, save } = useEntity(entityId);
  const [openCat, setOpenCat] = useState<null | "from" | "relationship" | "character" | "field">(null);
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const selected = useMemo(() => ({
    from: entity?.from ?? [],
    relationship: entity?.relationship ?? [],
    character: entity?.character ?? [],
    field: entity?.field ?? [],
  }), [entity]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [relationNames, setRelationNames] = useState<Record<string, string>>({});
  const [relationsPickerOpen, setRelationsPickerOpen] = useState(false);
  const [interactionsOpenKey, setInteractionsOpenKey] = useState(0);

  // Load names for related entities for chips (tolerant to permission-denied)
  useEffect(() => {
    (async () => {
      const ids = (entity?.relations ?? []).filter(Boolean) as string[];
      const missing = ids.filter((id) => !relationNames[id]);
      if (missing.length === 0) return;
      const out: Record<string, string> = {};
      const reads = missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, "entities", id));
          if (snap.exists()) {
            const data = snap.data() as { name?: unknown };
            out[id] = typeof data.name === 'string' ? data.name : id;
          }
        } catch {
          // ignore permission errors; skip unreabable related entities
        }
      });
      await Promise.allSettled(reads);
      setRelationNames((prev) => ({ ...prev, ...out }));
    })();
  }, [entity?.relations, db]);

  // Sync local editable fields when the focused entity changes
  useEffect(() => {
    setName(entity?.name ?? "");
    setInfo(entity?.info ?? "");
  }, [entity?.id, entity?.name, entity?.info]);

  if (!open || !entity) return null;

  const isOwner = auth.currentUser?.uid === entity.owner_id;
  const readonly = !isOwner;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 md:inset-auto md:bottom-4 md:top-4 md:right-4 md:left-4 bg-background rounded-none md:rounded-xl shadow-xl p-4 overflow-auto">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-lg bg-muted relative overflow-hidden">
            {!readonly && (
              <>
                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 text-white text-sm">📷</div>
                <input
                  title="upload"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={() => { /* no-op for now */ }}
                />
              </>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {!readonly && !editingName ? (
                <>
                  <h2 className="text-xl font-semibold">{name}</h2>
                  <button className="p-1 rounded hover:bg-muted" title="ערוך שם" onClick={() => setEditingName(true)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              ) : readonly ? (
                <h2 className="text-xl font-semibold">{name}</h2>
              ) : (
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => { setEditingName(false); const next = name.trim(); if (next !== (entity.name ?? "")) save({ name: next }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); const next = name.trim(); if (next !== (entity.name ?? "")) save({ name: next }); } if (e.key === 'Escape') { setEditingName(false); setName(entity.name ?? ""); } }}
                />
              )}
            </div>
            <div className="flex items-start gap-2">
              {!readonly && !editingInfo ? (
                <>
                  <p className="text-sm text-muted-foreground">{info}</p>
                  <button className="p-1 rounded hover:bg-muted mt-[-2px]" title="ערוך מידע" onClick={() => setEditingInfo(true)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              ) : readonly ? (
                <p className="text-sm text-muted-foreground">{info}</p>
              ) : (
                <Input
                  autoFocus
                  value={info}
                  placeholder="מידע"
                  onChange={(e) => setInfo(e.target.value)}
                  onBlur={() => { setEditingInfo(false); const next = info.trim(); if (next !== (entity.info ?? "")) save({ info: next }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setEditingInfo(false); const next = info.trim(); if (next !== (entity.info ?? "")) save({ info: next }); } if (e.key === 'Escape') { setEditingInfo(false); setInfo(entity.info ?? ""); } }}
                />
              )}
            </div>

            <div className="mt-2">
              <div className="text-lg font-semibold mb-2">תגיות</div>
              <div className="grid gap-3 md:grid-cols-2">
                {(["from","relationship","character","field"] as const).map((cat) => (
                  <div
                    key={cat}
                    className={`rounded-lg border p-2 ${readonly ? "cursor-default" : "cursor-pointer"}`}
                    onClick={() => { if (!readonly) setOpenCat(cat); }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{CATEGORY_LABELS[cat]}</div>
                      {!readonly && (
                        <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setOpenCat(cat); }}>+</Button>
                      )}
                    </div>
                    <TagChips category={cat} ids={selected[cat as keyof typeof selected] as string[]} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>X</Button>
        </div>

        {!readonly && (
          <TagPicker
            category={openCat ?? "from"}
            open={openCat !== null}
            onOpenChange={(v) => !v && setOpenCat(null)}
            selected={openCat ? (selected as Record<string, string[]>)[openCat] : []}
            onChange={(next) => { if (openCat) save({ [openCat]: next } as Record<string, unknown>); }}
            mode="edit"
          />
        )}

        <div className="mt-6">
          <hr className="my-3" />
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg font-semibold">קשרים</div>
            {!readonly && (
              <Button size="sm" variant="outline" onClick={() => setRelationsPickerOpen((v) => !v)}>+</Button>
            )}
          </div>
          {relationsPickerOpen && !readonly && (
            <div className="mb-2 inline-block max-w-full">
              <div className="inline-flex items-start gap-2 rounded-lg border p-2 bg-background">
                <RelationsPicker
                  value={entity.relations ?? []}
                  onChange={(ids) => { save({ relations: ids }); setRelationsPickerOpen(false); }}
                  excludeIds={[entity.id!]}
                  readonly={readonly}
                />
                <button className="text-sm px-2 py-1 border rounded" onClick={() => setRelationsPickerOpen(false)}>×</button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {(entity.relations ?? []).map((rid) => (
              <div key={rid} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm cursor-pointer">
                <span onClick={() => {
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.set("entity", rid);
                  router.replace(`/network?${sp.toString()}`);
                }}>{relationNames[rid] ?? rid}</span>
                {!readonly && (
                  <button
                    className="text-xs"
                    title="הסר"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = (entity.relations ?? []).filter((x) => x !== rid);
                      save({ relations: next });
                    }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <hr className="my-3" />
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg font-semibold">אינטראקציות</div>
            {!readonly && (
              <Button size="sm" variant="outline" onClick={() => { setRelationsPickerOpen(false); setInteractionsOpenKey((k: number) => k + 1); }}>+</Button>
            )}
          </div>
          <Interactions entityId={entity.id!} readonly={readonly} openKey={interactionsOpenKey} selfId={entity.id!} selfName={name} />
        </div>

        <div className="mt-6">
          <hr className="my-3" />
          <div className="text-lg font-semibold mb-2">הערות (Bits)</div>
          <Bits entityId={entity.id!} />
        </div>
      </div>
    </Dialog>
  );
}


