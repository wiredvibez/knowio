"use client";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, doc, setDoc, serverTimestamp, writeBatch, increment, getDoc } from "firebase/firestore";
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
  variant = "dialog",
}: {
  category: "from" | "relationship" | "character" | "field";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: string[];
  onChange: (next: string[]) => void;
  mode?: Mode;
  variant?: "dialog" | "inline";
}) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string; text_color: "light" | "dark"; usage_count: number }[]>([]);
  const coll = useMemo(() => collection(db, `picker_${category}`), [category]);

  useEffect(() => {
    const unsub = onSnapshot(query(coll, orderBy("usage_count", "desc")), (snap) => {
      setTags(snap.docs.map((d) => {
        const data = d.data() as { name: string; color: string; text_color: "light" | "dark"; usage_count: number };
        return { id: d.id, ...data };
      }));
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
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const normalizedId = trimmedName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[\/]+/g, "_");
    const ref = doc(coll, normalizedId);

    // Prefer local snapshot to detect duplicates quickly (by id or case-insensitive name)
    const existing = tags.find(
      (t) => t.id === normalizedId || t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    async function selectExisting(existingId: string) {
      const alreadySelected = selected.includes(existingId);
      if (!alreadySelected) {
        onChange([...selected, existingId]);
        if (mode === "edit") {
          const b = writeBatch(db);
          b.update(doc(coll, existingId), { usage_count: increment(1) });
          await b.commit();
        }
      }
      setQ("");
    }

    if (existing) {
      await selectExisting(existing.id);
      return;
    }

    // Fallback to server check to avoid overwriting if snapshot is stale
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await selectExisting(ref.id);
      return;
    }

    // Create new tag
    const color = generatePastelHex();
    const text_color = bestTextTone(color);
    await setDoc(ref, { name: trimmedName, color, text_color, usage_count: 0, created_at: serverTimestamp() });
    const next = selected.includes(ref.id) ? selected : [...selected, ref.id];
    onChange(next);
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

  // Prevent rendering when closed
  if (!open) return null;

  const content = (
    <div
      className={variant === "dialog" ? "fixed inset-x-4 top-20 z-[60] mx-auto max-w-2xl rounded-xl bg-background p-4 shadow-lg max-h-[70vh] overflow-auto" : "w-full p-3"}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false); }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש תגיות" />
        {mode === "edit" && (
          <Button onClick={() => q && createTag(q)} variant="secondary">+ {q}</Button>
        )}
        <button className="ml-auto text-sm opacity-70" onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}>✕</button>
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
  );

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <div
          className="fixed inset-0 bg-black/30 z-[60]"
          onClick={() => onOpenChange(false)}
        />
        {content}
      </Dialog>
    );
  }

  return content;
}


