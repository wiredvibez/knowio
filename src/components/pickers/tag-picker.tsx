"use client";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, doc, setDoc, serverTimestamp, writeBatch, increment } from "firebase/firestore";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePastelHex, bestTextTone } from "@/lib/colors";

type Mode = "edit" | "filter";

export function TagPicker({
  category,
  open,
  onOpenChange,
  selected,
  onChange,
  mode = "edit",
}: {
  category: "from" | "relationship" | "character" | "field";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: string[];
  onChange: (next: string[]) => void;
  mode?: Mode;
}) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string; text_color: "light" | "dark"; usage_count: number }[]>([]);
  const coll = useMemo(() => collection(db, `picker_${category}`), [category]);

  useEffect(() => {
    const unsub = onSnapshot(query(coll, orderBy("usage_count", "desc")), (snap) => {
      setTags(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [coll]);

  // Clear search whenever the picker opens or the category changes
  useEffect(() => {
    if (open) setQ("");
  }, [open, category]);

  const filtered = tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const ordered = useMemo(() => {
    const selectedSet = new Set(selected);
    const sel = filtered.filter((t) => selectedSet.has(t.id));
    const rest = filtered.filter((t) => !selectedSet.has(t.id));
    return [...sel, ...rest];
  }, [filtered, selected]);

  async function createTag(name: string) {
    if (mode === "filter") return; // no create in filter mode
    const id = name.toLowerCase().trim().replace(/\s+/g, "_");
    const ref = doc(coll, id);
    const color = generatePastelHex();
    const text_color = bestTextTone(color);
    await setDoc(ref, { name, color, text_color, usage_count: 0, created_at: serverTimestamp() });
    // auto-select newly created in edit mode
    const next = selected.includes(id) ? selected : [...selected, id];
    onChange(next);
    // and bump usage count by 1
    const b = writeBatch(db);
    b.update(ref, { usage_count: increment(1) });
    await b.commit();
    setQ("");
  }

  async function toggleTag(t: { id: string }) {
    const isSelected = selected.includes(t.id);
    const next = isSelected ? selected.filter((s) => s !== t.id) : [...selected, t.id];
    onChange(next);
    if (mode === "edit") {
      // inc/dec usage count
      const b = writeBatch(db);
      b.update(doc(coll, t.id), { usage_count: increment(isSelected ? -1 : 1) });
      await b.commit();
    }
    setQ("");
  }

  // Prevent overlay rendering when closed (fixes blocking UI on initial load)
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div
        className="fixed inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed inset-x-4 top-20 z-50 mx-auto max-w-2xl rounded-xl bg-background p-4 shadow-lg"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false); }}
      >
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש תגיות" />
          {mode === "edit" && (
            <Button onClick={() => q && createTag(q)} variant="secondary">+ {q}</Button>
          )}
          <button className="ml-auto text-sm opacity-70" onClick={() => onOpenChange(false)}>✕</button>
        </div>
        <div className="mt-3 max-h-[50vh] overflow-auto flex flex-wrap gap-2">
          {ordered.map((t) => (
            <Badge
              key={t.id}
              onClick={() => toggleTag(t)}
              className="cursor-pointer"
              style={{
                backgroundColor: selected.includes(t.id) ? t.color : undefined,
                color: selected.includes(t.id) ? (t.text_color === "light" ? "white" : "black") : undefined,
                borderColor: !selected.includes(t.id) ? t.color : undefined,
              }}
              variant={selected.includes(t.id) ? "default" : "outline"}
            >
              {t.name}
            </Badge>
          ))}
        </div>
      </div>
    </Dialog>
  );
}


