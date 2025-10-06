"use client";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressPicker } from "@/components/entity/address-picker";
import { Trash2 } from "lucide-react";

type Kind = "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date";

export function AddDataPopover({
  kind,
  trigger,
  onSave,
  open: controlledOpen,
  onOpenChange,
  initialValue,
  onDelete,
}: {
  kind: Kind;
  trigger: React.ReactNode;
  onSave: (value: unknown) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  initialValue?: unknown;
  onDelete?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [dateLabel, setDateLabel] = useState("יום הולדת");
  const [customDateLabel, setCustomDateLabel] = useState("");
  const [address, setAddress] = useState<string | undefined>(undefined);

  const finalDateLabel = useMemo(() => (dateLabel === "__custom__" ? (customDateLabel || "") : dateLabel), [dateLabel, customDateLabel]);

  const isOpen = controlledOpen ?? internalOpen;

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
      if (onOpenChange) onOpenChange(false); else setInternalOpen(false);
      reset();
    } catch {
      setError("שגיאה. נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  // Hydrate fields with initial value on open
  useEffect(() => {
    if (!isOpen) return;
    if (!initialValue) return;
    try {
      switch (kind) {
        case "phone": {
          const v = initialValue as { e164?: string };
          setText(v.e164 ?? "");
          break;
        }
        case "email": {
          const v = initialValue as { address?: string };
          setText(v.address ?? "");
          break;
        }
        case "insta":
        case "linkedin":
        case "url": {
          const v = initialValue as { url?: string; header?: string };
          setText(v.url ?? v.header ?? "");
          break;
        }
        case "address": {
          const v = initialValue as { formatted?: string; label?: string };
          setAddress(v.formatted ?? v.label ?? "");
          break;
        }
        case "date": {
          const v = initialValue as { label?: string; date?: Date | { toDate?: () => Date } };
          const toDate = (val: unknown): val is { toDate: () => Date } => !!val && typeof val === 'object' && 'toDate' in (val as Record<string, unknown>);
          const d = toDate(v.date) ? v.date!.toDate() : (v.date instanceof Date ? v.date : undefined);
          setDateStr(d ? new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10) : "");
          setDateLabel(v.label ?? "יום הולדת");
          break;
        }
      }
    } catch {
      // ignore hydration errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={(v) => { if (!v) reset(); if (onOpenChange) onOpenChange(v); else setInternalOpen(v); }}>
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
        <div className="flex items-center justify-between gap-2 pt-2">
          {onDelete ? (
            <Button variant="destructive" onClick={() => { onDelete(); if (onOpenChange) onOpenChange(false); else setInternalOpen(false); reset(); }} disabled={busy} className="inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> מחק
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { if (onOpenChange) onOpenChange(false); else setInternalOpen(false); }} disabled={busy}>בטל</Button>
            <Button onClick={save} disabled={busy || !emailValid}>שמור</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}


