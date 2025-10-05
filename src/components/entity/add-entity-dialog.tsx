"use client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, writeBatch, doc, increment } from "firebase/firestore";
import { useState } from "react";
import { TagPicker } from "@/components/pickers/tag-picker";
import { CATEGORY_LABELS } from "@/constants/tags";
import type { EntityDoc } from "@/types/firestore";
import { ContactChips } from "@/components/entity/contact-chips";
import { normalizePhoneToE164 } from "@/lib/utils";
import { AddDataDialog } from "@/components/entity/add-data-dialog";

const TYPES = ["person", "organization", "community", "group", "other"] as const;

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
  const [addresses, setAddresses] = useState<EntityDoc["addresses"]>([]);
  const [dates, setDates] = useState<EntityDoc["dates"]>([]);
  const [dialogKind, setDialogKind] = useState<null | "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date">(null);

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
      <div className="fixed inset-0 bg-black/30" onClick={cancel} />
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-2xl rounded-xl bg-background p-4 shadow-lg space-y-3">
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
            dates={dates as any}
            readonly={false}
            onAddPhone={() => setDialogKind("phone")}
            onAddEmail={() => setDialogKind("email")}
            onAddInsta={() => setDialogKind("insta")}
            onAddLinkedin={() => setDialogKind("linkedin")}
            onAddUrl={() => setDialogKind("url")}
            onAddAddress={() => setDialogKind("address")}
            onAddDate={() => setDialogKind("date")}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(["from","relationship","character","field"] as const).map((cat) => (
            <div key={cat} className="rounded-lg border p-2 cursor-pointer" onClick={() => setOpenCat(cat)}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{CATEGORY_LABELS[cat]}</div>
                <Button size="sm" variant="outline" onClick={() => setOpenCat(cat)} onMouseDown={(e) => e.stopPropagation()}>+</Button>
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
      </div>
      <TagPicker
        category={openCat ?? "from"}
        open={openCat !== null}
        onOpenChange={(v) => !v && setOpenCat(null)}
        selected={openCat ? tags[openCat] : []}
        onChange={(next) => openCat && setTags((t) => ({ ...t, [openCat]: next }))}
        mode="edit"
      />
      <AddDataDialog
        kind={(dialogKind ?? "phone") as any}
        open={dialogKind !== null}
        onOpenChange={(v) => { if (!v) setDialogKind(null); }}
        onSave={(val) => {
          if (dialogKind === "phone") {
            const v = (val as { e164?: string }).e164 || "";
            const { e164, error } = normalizePhoneToE164(v);
            if (error) return alert(error);
            const next = [...(contact.phone ?? [])];
            if (e164) next.push({ e164 });
            setContact((c) => ({ ...(c ?? {}), phone: next }));
          } else if (dialogKind === "email") {
            const addr = (val as { address?: string }).address?.trim();
            if (!addr) return;
            const next = [...(contact.email ?? [])];
            next.push({ address: addr });
            setContact((c) => ({ ...(c ?? {}), email: next }));
          } else if (dialogKind === "insta") {
            const { url, header } = val as { url: string; header?: string };
            const next = [...(contact.insta ?? [])];
            next.push({ url, header });
            setContact((c) => ({ ...(c ?? {}), insta: next }));
          } else if (dialogKind === "linkedin") {
            const { url } = val as { url: string };
            const next = [...(contact.linkedin ?? [])];
            next.push({ url });
            setContact((c) => ({ ...(c ?? {}), linkedin: next }));
          } else if (dialogKind === "url") {
            const { url } = val as { url: string };
            const next = [...(contact.url ?? [])];
            next.push({ url });
            setContact((c) => ({ ...(c ?? {}), url: next }));
          } else if (dialogKind === "address") {
            const { formatted, label, placeId, lat, lng } = (val as any) || {};
            setAddresses((prev) => ([...prev, { formatted: formatted ?? label ?? "", label: label ?? formatted ?? "", placeId, lat, lng }]));
          } else if (dialogKind === "date") {
            const { label, date } = (val as { label: string; date: Date });
            setDates((prev) => ([...prev, { label, date: date as any }]));
          }
          setDialogKind(null);
        }}
      />
    </Dialog>
  );
}


