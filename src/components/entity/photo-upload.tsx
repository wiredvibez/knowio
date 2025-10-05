"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Plus, Loader2 } from "lucide-react";

export function EntityPhotoUpload({
  entityId,
  ownerUid,
  initialUrl,
  size = 80,
  onUploaded,
}: {
  entityId: string;
  ownerUid: string;
  initialUrl?: string;
  size?: number;
  onUploaded: (url: string) => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(initialUrl);
  }, [initialUrl]);

  const dimension = useMemo(() => ({ width: size, height: size }), [size]);

  async function handleFile(file?: File | null) {
    if (!file) return;
    setError(null);
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setBusy(true);
    try {
      const path = `users/${ownerUid}/entities/${entityId}/photos/photo.jpg`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(r);
      setPreviewUrl(url);
      await onUploaded(url);
    } catch (e) {
      console.error(e);
      setError("שגיאה בהעלאה. נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-block">
      <div
        className="group relative cursor-pointer rounded-lg bg-muted overflow-hidden"
        style={{ width: dimension.width, height: dimension.height }}
        onClick={() => fileRef.current?.click()}
        title="העלה תמונה"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="entity" className="size-full object-cover" />
        ) : (
          <div className="size-full" />
        )}
        <div className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}


