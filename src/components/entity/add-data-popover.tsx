"use client";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressPicker } from "@/components/entity/address-picker";

type Kind = "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date";

export function AddDataPopover({
  kind,
  trigger,
  onSave,
}: {
  kind: Kind;
  trigger: React.ReactNode;
  onSave: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const emailValid = kind !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

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
        case "insta": {
          const input = text.trim();
          const isUrl = /^https?:\/\//i.test(input);
          const handle = input.startsWith("@") ? input.slice(1) : input;
          const url = isUrl ? input : `https://instagram.com/${handle}`;
          const header = isUrl ? undefined : `@${handle}`;
          onSave({ url, header });
          break;
        }
        case "linkedin":
          onSave({ url: text.trim() });
          break;
        case "url":
          onSave({ url: text.trim() });
          break;
        case "address":
          onSave({ formatted: address ?? "", label: address ?? "" });
          break;
        case "date": {
          const label = finalDateLabel.trim();
          const d = dateStr ? new Date(dateStr) : new Date();
          d.setHours(0,0,0,0);
          onSave({ label, date: d });
          break;
        }
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError("שגיאה. נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 p-3">
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
            {!emailValid && <div className="text-xs text-red-600">אימייל לא חוקי</div>}
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
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>בטל</Button>
          <Button onClick={save} disabled={busy || !emailValid}>שמור</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


