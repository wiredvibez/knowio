"use client";
import { Dialog } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";

export function ShareDialog({ open, onOpenChange, entityIds }: { open: boolean; onOpenChange: (v: boolean) => void; entityIds: string[] }) {
  const uid = auth.currentUser?.uid;
  const [friends, setFriends] = useState<{ id: string; display_name?: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const rows = snap.docs
        .filter((d) => (d.data()?.friends as string[] | undefined)?.includes(uid))
        .map((d) => ({ id: d.id, display_name: d.data()?.display_name as string | undefined }));
      setFriends(rows);
    });
    return () => unsub();
  }, [uid]);

  async function share() {
    if (!uid || !selected || entityIds.length === 0) return;
    await addDoc(collection(db, "shares"), {
      sender_id: uid,
      recipient_id: selected,
      entity_ids: entityIds,
      confirmed: false,
      created_at: serverTimestamp(),
    });
    onOpenChange(false);
    setSelected(null);
  }

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-xl bg-background p-4 shadow-lg">
        <h3 className="font-semibold mb-2">שיתוף עם</h3>
        <div className="space-y-2 max-h-[50vh] overflow-auto">
          {friends.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="friend" checked={selected === f.id} onChange={() => setSelected(f.id)} />
              <span>{f.display_name ?? f.id}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-1 rounded border" onClick={() => onOpenChange(false)}>בטל</button>
          <button className="px-3 py-1 rounded bg-foreground text-background disabled:opacity-50" disabled={!selected} onClick={share}>שתף</button>
        </div>
      </div>
    </Dialog>
  );
}


