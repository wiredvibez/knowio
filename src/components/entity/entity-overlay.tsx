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
import { Pencil, X, Plus } from "lucide-react";
import { Interactions, NewInteractionForm } from "@/components/entity/interactions";
import { Bits } from "@/components/entity/bits";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { EntityPhotoUpload } from "@/components/entity/photo-upload";
import { ContactChips } from "@/components/entity/contact-chips";
import { AddDataPopover } from "@/components/entity/add-data-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizePhoneToE164 } from "@/lib/utils";

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
  const [interactionsPopoverOpen, setInteractionsPopoverOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
      <div className="fixed inset-0 md:inset-auto md:bottom-4 md:top-4 md:right-4 md:left-4 bg-background rounded-none md:rounded-xl shadow-xl overflow-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b p-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden">
              {readonly ? (
                entity.photo_url ? (
                  <img src={entity.photo_url} alt="entity" className="size-full object-cover" />
                ) : (
                  <div className="size-full" />
                )
              ) : (
                <EntityPhotoUpload entityId={entity.id!} ownerUid={entity.owner_id} initialUrl={entity.photo_url} size={80} onUploaded={(url) => save({ photo_url: url })} />
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
            </div>
            <button className="ms-auto p-2 rounded hover:bg-muted" onClick={() => onOpenChange(false)} title="סגור">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4 pb-10">
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-lg font-semibold">פרטי קשר ותוספים</div>
              {!readonly && (
                <button className="p-1 rounded hover:bg-muted" title="מצב עריכה" onClick={() => setEditMode((v) => !v)}>
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
            <ContactChips
              contact={entity.contact}
              addresses={entity.addresses}
              dates={entity.dates as any}
              readonly={true}
              editMode={editMode}
              onRemovePhone={(i) => {
                const next = [...(entity.contact?.phone ?? [])];
                next.splice(i, 1);
                const contact = { ...(entity.contact ?? {}), phone: next } as NonNullable<typeof entity.contact>;
                save({ contact });
              }}
              onRemoveEmail={(i) => {
                const next = [...(entity.contact?.email ?? [])];
                next.splice(i, 1);
                const contact = { ...(entity.contact ?? {}), email: next } as NonNullable<typeof entity.contact>;
                save({ contact });
              }}
              onRemoveInsta={(i) => {
                const next = [...(entity.contact?.insta ?? [])];
                next.splice(i, 1);
                const contact = { ...(entity.contact ?? {}), insta: next } as NonNullable<typeof entity.contact>;
                save({ contact });
              }}
              onRemoveLinkedin={(i) => {
                const next = [...(entity.contact?.linkedin ?? [])];
                next.splice(i, 1);
                const contact = { ...(entity.contact ?? {}), linkedin: next } as NonNullable<typeof entity.contact>;
                save({ contact });
              }}
              onRemoveUrl={(i) => {
                const next = [...(entity.contact?.url ?? [])];
                next.splice(i, 1);
                const contact = { ...(entity.contact ?? {}), url: next } as NonNullable<typeof entity.contact>;
                save({ contact });
              }}
              onRemoveAddress={(i) => {
                const next = [...(entity.addresses ?? [])];
                next.splice(i, 1);
                save({ addresses: next });
              }}
              onRemoveDate={(i) => {
                const next = [...(entity.dates ?? [])];
                next.splice(i, 1);
                save({ dates: next as any });
              }}
            />

            {/* Inline add popovers anchored to visible add chips */}
            {!readonly && (
              <div className="mt-2 flex flex-wrap gap-2">
                <AddDataPopover kind="phone" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-emerald-50"><Plus className="h-3 w-3" /> טלפון</button>}
                  onSave={(val) => {
                    const v = (val as { e164?: string }).e164 || "";
                    const { e164, error } = normalizePhoneToE164(v);
                    if (error) return alert(error);
                    const next = [...(entity.contact?.phone ?? [])];
                    if (e164) next.push({ e164 });
                    const contact = { ...(entity.contact ?? {}), phone: next } as NonNullable<typeof entity.contact>;
                    save({ contact });
                  }} />
                <AddDataPopover kind="email" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-blue-50"><Plus className="h-3 w-3" /> אימייל</button>}
                  onSave={(val) => {
                    const addr = (val as { address?: string }).address?.trim();
                    if (!addr) return;
                    const next = [...(entity.contact?.email ?? [])];
                    next.push({ address: addr });
                    const contact = { ...(entity.contact ?? {}), email: next } as NonNullable<typeof entity.contact>;
                    save({ contact });
                  }} />
                <AddDataPopover kind="insta" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-pink-50"><Plus className="h-3 w-3" /> אינסטגרם</button>}
                  onSave={(val) => {
                    const { url, header } = val as { url: string; header?: string };
                    const next = [...(entity.contact?.insta ?? [])];
                    next.push({ url, header });
                    const contact = { ...(entity.contact ?? {}), insta: next } as NonNullable<typeof entity.contact>;
                    save({ contact });
                  }} />
                <AddDataPopover kind="linkedin" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-sky-50"><Plus className="h-3 w-3" /> לינקדאין</button>}
                  onSave={(val) => {
                    const { url } = val as { url: string };
                    const next = [...(entity.contact?.linkedin ?? [])];
                    next.push({ url });
                    const contact = { ...(entity.contact ?? {}), linkedin: next } as NonNullable<typeof entity.contact>;
                    save({ contact });
                  }} />
                <AddDataPopover kind="url" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-purple-50"><Plus className="h-3 w-3" /> קישור</button>}
                  onSave={(val) => {
                    const { url } = val as { url: string };
                    const next = [...(entity.contact?.url ?? [])];
                    next.push({ url });
                    const contact = { ...(entity.contact ?? {}), url: next } as NonNullable<typeof entity.contact>;
                    save({ contact });
                  }} />
                <AddDataPopover kind="address" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-indigo-50"><Plus className="h-3 w-3" /> כתובת</button>}
                  onSave={(val: any) => {
                    const { formatted, label, placeId, lat, lng } = val || {};
                    const next = [...(entity.addresses ?? [])];
                    next.push({ formatted: formatted ?? label ?? "", label: label ?? formatted ?? "", placeId, lat, lng });
                    save({ addresses: next });
                  }} />
                <AddDataPopover kind="date" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-amber-50"><Plus className="h-3 w-3" /> תאריך חדש</button>}
                  onSave={(val: any) => {
                    const { label, date } = val as { label: string; date: Date };
                    const next = [...(entity.dates ?? [])];
                    next.push({ label, date: date as any });
                    save({ dates: next });
                  }} />
              </div>
            )}
          </div>
          <div className="mt-6">
            <div className="text-lg font-semibold mb-2">תגיות</div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["from","relationship","character","field"] as const).map((cat) => (
                <div key={cat} className={`rounded-lg border p-2 ${readonly ? "cursor-default" : "cursor-pointer"}`} onClick={() => { if (!readonly) setOpenCat(cat); }}>
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
                  <button className="text-xs" title="הסר" onClick={(e) => { e.stopPropagation(); const next = (entity.relations ?? []).filter((x) => x !== rid); save({ relations: next }); }}>×</button>
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
              <Popover open={interactionsPopoverOpen} onOpenChange={setInteractionsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setRelationsPickerOpen(false)}>+</Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" className="w-[480px] p-3">
                  <NewInteractionForm
                    entityId={entity.id!}
                    onCancel={() => setInteractionsPopoverOpen(false)}
                    onCreated={() => setInteractionsPopoverOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Interactions entityId={entity.id!} readonly={readonly} selfId={entity.id!} selfName={name} />
        </div>

        <div className="mt-6">
          <hr className="my-3" />
          <div className="text-lg font-semibold mb-2">הערות (Bits)</div>
          <Bits entityId={entity.id!} />
        </div>
        {!readonly && (
          <div className="mt-8 border-t pt-4">
            <Button variant="destructive" onClick={() => {
              const ev = new CustomEvent("open-delete-entities", { detail: { ids: [entity.id!] } });
              window.dispatchEvent(ev);
            }}>מחיקת האישיות</Button>
          </div>
        )}
        </div>
      </div>
    </Dialog>
  );
}


