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
import { auth } from "@/lib/firebase";

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
          <div className="text-lg font-semibold mb-2">קשרים</div>
          <RelationsPicker
            value={entity.relations ?? []}
            onChange={(ids) => save({ relations: ids })}
            excludeIds={[entity.id!]}
            readonly={readonly}
          />
        </div>

        <div className="mt-6">
          <hr className="my-3" />
          <div className="text-lg font-semibold mb-2">אינטראקציות</div>
          <Interactions entityId={entity.id!} readonly={readonly} />
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


