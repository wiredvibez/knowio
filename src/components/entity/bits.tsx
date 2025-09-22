"use client";
import { useBits } from "@/hooks/useBits";
import { useState } from "react";

export function Bits({ entityId }: { entityId: string }) {
  const { bits, post } = useBits(entityId);
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="הוסף תגובה" onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { post(text.trim()); setText(""); } }} />
      </div>
      <div className="space-y-2">
        {bits.map((b) => (
          <div key={b.id} className="text-sm p-2 rounded border">
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}


