"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, writeBatch, doc, increment } from "firebase/firestore";
import { useState } from "react";
import { TagPicker } from "@/components/pickers/tag-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CATEGORY_LABELS } from "@/constants/tags";
import type { EntityDoc } from "@/types/firestore";
import { ContactChips } from "@/components/entity/contact-chips";
import { normalizePhoneToE164 } from "@/lib/utils";
import { AddDataPopover } from "@/components/entity/add-data-popover";
import { Plus } from "lucide-react";

const TYPES = ["person", "organization", "community", "group", "other"] as const;
type DialogKind = "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date";

export function AddEntityDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("person");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [openCat, setOpenCat] = useState<null | "from" | "relationship" | "character" | "field">(null);
  const [tags, setTags] = useState<{ from: string[]; relationship: string[]; character: string[]; field: string[] }>({ from: [], relationship: [], character: [], field: [] });
  const [contact, setContact] = useState<NonNullable<EntityDoc["contact"]>>({});
  const [addresses, setAddresses] = useState<NonNullable<EntityDoc["addresses"]>>([]);
  const [dates, setDates] = useState<{ label: string; date: Date }[]>([]);
  const [dialogKind, setDialogKind] = useState<null | DialogKind>(null);

  if (!open) return null;

  async function decrementSelectedTagCounts() {
    const b = writeBatch(db);
    (Object.keys(tags) as (keyof typeof tags)[]).forEach((cat) => {
      tags[cat].forEach((id) => {
        b.update(doc(collection(db, `picker_${cat}`), id), { usage_count: increment(-1) });
      });
    });
    try { await b.commit(); } catch {}
  }

  async function cancel() {
    await decrementSelectedTagCounts();
    onOpenChange(false);
  }

  async function save() {
    if (!auth.currentUser || !name.trim()) return;
    setSaving(true);
    const docRef = await addDoc(collection(db, "entities"), {
      type,
      name: name.trim(),
      info: info.trim() || "",
      from: tags.from,
      relationship: tags.relationship,
      character: tags.character,
      field: tags.field,
      relations: [],
      contact,
      addresses,
      dates,
      owner_id: auth.currentUser.uid,
      viewer_ids: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    setSaving(false);
    onOpenChange(false);
    setName(""); setInfo(""); setType("person"); setTags({ from: [], relationship: [], character: [], field: [] }); setContact({}); setAddresses([]); setDates([]);
    onCreated?.(docRef.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cancel(); else onOpenChange(v); }}>
      <DialogContent className="space-y-3 sm:max-w-2xl">
        <h2 className="text-lg font-semibold">הנה מוסיפים</h2>
        <div className="space-y-2">
          <label className="text-sm">שם (חובה)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם" />
        </div>
        <div className="space-y-2">
          <label className="text-sm">סוג</label>
          <select className="h-10 rounded-md border px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as typeof TYPES[number])}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm">מידע</label>
          <Input value={info} onChange={(e) => setInfo(e.target.value)} placeholder="תיאור קצר" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">פרטי קשר ותוספים</div>
          <ContactChips
            contact={contact}
            addresses={addresses}
            dates={dates}
            readonly={false}
          />
          <div className="flex flex-wrap gap-2">
            <AddDataPopover kind="phone" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-emerald-50"><Plus className="h-3 w-3" /> טלפון</button>}
              onSave={(val) => {
                const v = (val as { e164?: string }).e164 || "";
                const { e164, error } = normalizePhoneToE164(v);
                if (error) return alert(error);
                const next = [...(contact.phone ?? [])];
                if (e164) next.push({ e164 });
                setContact((c) => ({ ...(c ?? {}), phone: next }));
              }} />
            <AddDataPopover kind="email" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-blue-50"><Plus className="h-3 w-3" /> אימייל</button>}
              onSave={(val) => {
                const addr = (val as { address?: string }).address?.trim();
                if (!addr) return;
                const next = [...(contact.email ?? [])];
                next.push({ address: addr });
                setContact((c) => ({ ...(c ?? {}), email: next }));
              }} />
            <AddDataPopover kind="insta" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-pink-50"><Plus className="h-3 w-3" /> אינסטגרם</button>}
              onSave={(val) => {
                const { url, header } = val as { url: string; header?: string };
                const next = [...(contact.insta ?? [])];
                next.push({ url, header });
                setContact((c) => ({ ...(c ?? {}), insta: next }));
              }} />
            <AddDataPopover kind="linkedin" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-sky-50"><Plus className="h-3 w-3" /> לינקדאין</button>}
              onSave={(val) => {
                const { url } = val as { url: string };
                const next = [...(contact.linkedin ?? [])];
                next.push({ url });
                setContact((c) => ({ ...(c ?? {}), linkedin: next }));
              }} />
            <AddDataPopover kind="url" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-purple-50"><Plus className="h-3 w-3" /> קישור</button>}
              onSave={(val) => {
                const { url } = val as { url: string };
                const next = [...(contact.url ?? [])];
                next.push({ url });
                setContact((c) => ({ ...(c ?? {}), url: next }));
              }} />
            <AddDataPopover kind="address" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-indigo-50"><Plus className="h-3 w-3" /> כתובת</button>}
              onSave={(v: unknown) => {
                const { formatted, label, placeId, lat, lng } = (v as { formatted?: string; label?: string; placeId?: string; lat?: number; lng?: number }) || {};
                setAddresses((prev) => ([...prev, { formatted: formatted ?? label ?? "", label: label ?? formatted ?? "", placeId, lat, lng }]));
              }} />
            <AddDataPopover kind="date" trigger={<button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-amber-50"><Plus className="h-3 w-3" /> תאריך חדש</button>}
              onSave={(v: unknown) => {
                const { label, date } = v as { label: string; date: Date };
                setDates((prev) => ([...prev, { label, date }]));
              }} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(["from","relationship","character","field"] as const).map((cat) => (
            <div key={cat} className="rounded-lg border p-2 cursor-pointer" onClick={() => setOpenCat(cat)}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{CATEGORY_LABELS[cat]}</div>
                <Popover open={openCat === cat} onOpenChange={(v) => { if (v) setOpenCat(cat); else setOpenCat(null); }}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); }}>+</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" side="bottom" className="w-[520px] max-w-[calc(100vw-1rem)] p-0">
                    <TagPicker
                      category={cat}
                      open={openCat === cat}
                      onOpenChange={(v) => { if (!v) setOpenCat(null); }}
                      selected={tags[cat]}
                      onChange={(next) => setTags((t) => ({ ...t, [cat]: next }))}
                      mode="edit"
                      variant="inline"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags[cat].map((t) => (
                  <span key={t} className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: '#eef' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={cancel}>בטל</Button>
          <Button onClick={save} disabled={!name.trim() || saving}>שמור</Button>
        </div>
      </DialogContent>
      
      
    </Dialog>
  );
}


