"use client";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useState } from "react";

export function ImageUploader({ path, onUploaded }: { path: string; onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const r = ref(storage, path);
    await uploadBytes(r, f, { contentType: f.type });
    const url = await getDownloadURL(r);
    setBusy(false);
    onUploaded(url);
  }
  return (
    <div>
      <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
    </div>
  );
}


