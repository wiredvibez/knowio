"use client";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressPicker } from "@/components/entity/address-picker";

type Kind = "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date";

export function AddDataDialog({
  kind,
  open,
  onOpenChange,
  onSave,
}: {
  kind: Kind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (value: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fields
  const [text, setText] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [dateLabel, setDateLabel] = useState("יום הולדת");
  const [customDateLabel, setCustomDateLabel] = useState("");
  const [address, setAddress] = useState<string | undefined>(undefined);

  const finalDateLabel = useMemo(() => (dateLabel === "__custom__" ? (customDateLabel || "") : dateLabel), [dateLabel, customDateLabel]);

  function reset() {
    setBusy(false);
    setError(null);
    setText("");
    setDateStr("");
    setDateLabel("יום הולדת");
    setCustomDateLabel("");
    setAddress(undefined);
  }

  function save() {
    setBusy(true);
    try {
      switch (kind) {
        case "phone":
          onSave({ e164: text.trim() });
          break;
        case "email":
          onSave({ address: text.trim() });
          break;
        case "insta":
          {
            const input = text.trim();
            const isUrl = /^https?:\/\//i.test(input);
            const handle = input.startsWith("@") ? input.slice(1) : input;
            const url = isUrl ? input : `https://instagram.com/${handle}`;
            const header = isUrl ? undefined : `@${handle}`;
            onSave({ url, header });
          }
          break;
        case "linkedin":
          onSave({ url: text.trim() });
          break;
        case "url":
          onSave({ url: text.trim() });
          break;
        case "address":
          onSave({ formatted: address ?? "", label: address ?? "" });
          break;
        case "date":
          {
            const label = finalDateLabel.trim();
            const d = dateStr ? new Date(dateStr) : new Date();
            d.setHours(0,0,0,0);
            onSave({ label, date: d });
          }
          break;
      }
      onOpenChange(false);
      reset();
    } catch (e) {
      setError("שגיאה. נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <div className="fixed inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-x-4 top-28 z-50 mx-auto max-w-md rounded-xl bg-background p-4 shadow-lg space-y-3">
        {kind === "phone" && (
          <div className="space-y-2">
            <div className="text-sm">מספר טלפון</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="050... או +972..." />
          </div>
        )}
        {kind === "email" && (
          <div className="space-y-2">
            <div className="text-sm">אימייל</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="name@example.com" />
          </div>
        )}
        {kind === "insta" && (
          <div className="space-y-2">
            <div className="text-sm">אינסטגרם (קישור או @handle)</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="@handle או https://instagram.com/..." />
          </div>
        )}
        {kind === "linkedin" && (
          <div className="space-y-2">
            <div className="text-sm">לינקדאין (קישור)</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
        )}
        {kind === "url" && (
          <div className="space-y-2">
            <div className="text-sm">קישור</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://..." />
          </div>
        )}
        {kind === "address" && (
          <div className="space-y-2">
            <div className="text-sm">כתובת</div>
            <AddressPicker value={address} onChange={setAddress} />
          </div>
        )}
        {kind === "date" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm">תאריך</div>
              <input type="date" className="border rounded px-2 py-1 h-9 w-full" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm">סוג תאריך</div>
              <select className="h-9 rounded-md border px-2 text-sm w-full" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)}>
                <option value="יום הולדת">יום הולדת</option>
                <option value="יום נישואין">יום נישואין</option>
                <option value="__custom__">אחר...</option>
              </select>
              {dateLabel === "__custom__" && (
                <Input value={customDateLabel} onChange={(e) => setCustomDateLabel(e.target.value)} placeholder="שם מותאם" />
              )}
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>בטל</Button>
          <Button onClick={save} disabled={busy}>שמור</Button>
        </div>
      </div>
    </Dialog>
  );
}


