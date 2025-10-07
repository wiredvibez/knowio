"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2 } from "lucide-react";

export function ProfilePhotoUpload({
  initialUrl,
  onUploaded,
  size = 80,
}: {
  initialUrl?: string;
  onUploaded: (url: string) => Promise<void> | void;
  size?: number;
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
    // optimistic local preview
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setBusy(true);
    try {
      const u = auth.currentUser;
      if (!u) throw new Error("not-signed-in");
      const path = `users/${u.uid}/profile/photo.jpg`;
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
        className="group relative cursor-pointer"
        style={{ width: dimension.width, height: dimension.height }}
        onClick={() => fileRef.current?.click()}
      >
        <Avatar className="size-full">
          <AvatarImage
            src={previewUrl && previewUrl.trim() !== "" ? previewUrl : undefined}
            alt="avatar"
            referrerPolicy="no-referrer"
          />
          <AvatarFallback>🙂</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/40 text-white group-hover:flex">
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


