"use client";
import type { EntityDoc } from "@/types/firestore";
import { Phone, Mail, Globe, Instagram, Linkedin, MessageCircle, Plus, MapPin, Calendar, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddDataPopover } from "@/components/entity/add-data-popover";

type Contact = EntityDoc["contact"];

function openInSameTab(url?: string) {
  if (!url) return;
  const href = url.startsWith("http") ? url : `https://${url}`;
  window.location.href = href;
}

function whatsapp(e164: string) {
  const num = (e164 || "").replace(/^\+/, "");
  if (!num) return;
  window.location.href = `https://wa.me/${num}`;
}

function tel(e164: string) {
  if (!e164) return;
  window.location.href = `tel:${e164}`;
}

function mail(address: string) {
  if (!address) return;
  window.location.href = `mailto:${address}`;
}

export function ContactIcons({ contact }: { contact?: Contact }) {
  const phones = contact?.phone ?? [];
  const emails = contact?.email ?? [];
  const insta = contact?.insta ?? [];
  const linkedin = contact?.linkedin ?? [];
  const urls = contact?.url ?? [];

  return (
    <div className="flex items-center gap-2">
      {phones.slice(0, 2).map((p, i) => (
        <div key={`ph${i}`} className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-green-100" title={p.e164} onClick={() => whatsapp(p.e164)}>
            <MessageCircle className="h-4 w-4" />
          </button>
          <button className="p-1 rounded hover:bg-emerald-100" title={p.e164} onClick={() => tel(p.e164)}>
            <Phone className="h-4 w-4" />
          </button>
        </div>
      ))}
      {emails.slice(0, 2).map((m, i) => (
        <button key={`em${i}`} className="p-1 rounded hover:bg-blue-100" title={m.address} onClick={() => mail(m.address)}>
          <Mail className="h-4 w-4" />
        </button>
      ))}
      {insta.slice(0, 1).map((u, i) => (
        <button key={`ig${i}`} className="p-1 rounded hover:bg-pink-100" title={u.url} onClick={() => openInSameTab(u.url)}>
          <Instagram className="h-4 w-4" />
        </button>
      ))}
      {linkedin.slice(0, 1).map((u, i) => (
        <button key={`li${i}`} className="p-1 rounded hover:bg-sky-100" title={u.url} onClick={() => openInSameTab(u.url)}>
          <Linkedin className="h-4 w-4" />
        </button>
      ))}
      {urls.slice(0, 2).map((u, i) => (
        <button key={`ur${i}`} className="p-1 rounded hover:bg-purple-100" title={u.url} onClick={() => openInSameTab(u.url)}>
          <Globe className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function ContactChips({
  contact,
  addresses,
  dates,
  readonly,
  editMode,
  onAddPhone,
  onAddEmail,
  onAddInsta,
  onAddUrl,
  onAddLinkedin,
  onAddAddress,
  onAddDate,
  onRemovePhone,
  onRemoveEmail,
  onRemoveInsta,
  onRemoveLinkedin,
  onRemoveUrl,
  onRemoveAddress,
  onRemoveDate,
  onUpdatePhone,
  onUpdateEmail,
  onUpdateInsta,
  onUpdateLinkedin,
  onUpdateUrl,
  onUpdateAddress,
  onUpdateDate,
}: {
  contact?: Contact;
  addresses?: { formatted: string; placeId?: string; lat?: number; lng?: number; label: string }[];
  dates?: { label: string; date: Date | { toDate?: () => Date } }[];
  readonly?: boolean;
  editMode?: boolean;
  onAddPhone?: () => void;
  onAddEmail?: () => void;
  onAddInsta?: () => void;
  onAddUrl?: () => void;
  onAddLinkedin?: () => void;
  onAddAddress?: () => void;
  onAddDate?: () => void;
  onRemovePhone?: (index: number) => void;
  onRemoveEmail?: (index: number) => void;
  onRemoveInsta?: (index: number) => void;
  onRemoveLinkedin?: (index: number) => void;
  onRemoveUrl?: (index: number) => void;
  onRemoveAddress?: (index: number) => void;
  onRemoveDate?: (index: number) => void;
  onUpdatePhone?: (index: number, next: { e164: string }) => void;
  onUpdateEmail?: (index: number, next: { address: string }) => void;
  onUpdateInsta?: (index: number, next: { url: string; header?: string }) => void;
  onUpdateLinkedin?: (index: number, next: { url: string }) => void;
  onUpdateUrl?: (index: number, next: { url: string }) => void;
  onUpdateAddress?: (index: number, next: { formatted: string; label: string; placeId?: string; lat?: number; lng?: number }) => void;
  onUpdateDate?: (index: number, next: { label: string; date: Date | { toDate?: () => Date } }) => void;
}) {
  const phones = contact?.phone ?? [];
  const emails = contact?.email ?? [];
  const insta = contact?.insta ?? [];
  const linkedin = contact?.linkedin ?? [];
  const urls = contact?.url ?? [];
  const addr = addresses ?? [];
  const ds = dates ?? [];

  const [editor, setEditor] = useState<null | { kind: "phone" | "email" | "insta" | "linkedin" | "url" | "address" | "date"; index: number }>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const pressMs = 600;

  function startPress(kind: NonNullable<typeof editor>["kind"], index: number) {
    if (timer) window.clearTimeout(timer);
    const t = window.setTimeout(() => setEditor({ kind, index }), pressMs);
    setTimer(t);
  }
  function cancelPress() {
    if (timer) window.clearTimeout(timer);
    setTimer(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {phones.map((p, i) => (
          <div
            key={`phc${i}`}
            className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-emerald-50 flex-wrap"
            onContextMenu={(e) => { e.preventDefault(); if (!readonly) setEditor({ kind: "phone", index: i }); }}
            onPointerDown={() => { if (!readonly) startPress("phone", i); }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
          >
            <span className="font-medium">{p.e164}</span>
            <button className="inline-flex items-center gap-1" onClick={() => whatsapp(p.e164)}>
              <MessageCircle className="h-3 w-3" /> וואטסאפ
            </button>
            <span className="text-foreground/30">|</span>
            <button className="inline-flex items-center gap-1" onClick={() => tel(p.e164)}>
              <Phone className="h-3 w-3" /> שיחה
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemovePhone?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "phone" && editor.index === i && !readonly && (
              <AddDataPopover
                kind="phone"
                trigger={<span />}
                open={true}
                onOpenChange={(v) => { if (!v) setEditor(null); }}
                initialValue={p}
                onSave={(val) => { onUpdatePhone?.(i, val as { e164: string }); setEditor(null); }}
                onDelete={() => { onRemovePhone?.(i); setEditor(null); }}
              />
            )}
          </div>
        ))}

        {emails.map((m, i) => (
          <div
            key={`emc${i}`}
            className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-blue-50 flex-wrap"
            onContextMenu={(e) => { e.preventDefault(); if (!readonly) setEditor({ kind: "email", index: i }); }}
            onPointerDown={() => { if (!readonly) startPress("email", i); }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
          >
            <button className="inline-flex items-center gap-1" onClick={() => mail(m.address)} title={m.address}>
              <Mail className="h-3 w-3" />
              <span className="break-all">{m.address}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveEmail?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "email" && editor.index === i && !readonly && (
              <AddDataPopover
                kind="email"
                trigger={<span />}
                open={true}
                onOpenChange={(v) => { if (!v) setEditor(null); }}
                initialValue={m}
                onSave={(val) => { onUpdateEmail?.(i, val as { address: string }); setEditor(null); }}
                onDelete={() => { onRemoveEmail?.(i); setEditor(null); }}
              />
            )}
          </div>
        ))}

        {insta.map((u, i) => (
          <div key={`igc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-pink-50 flex-wrap" onContextMenu={(e)=>{ e.preventDefault(); if (!readonly) setEditor({ kind: "insta", index: i }); }} onPointerDown={()=>{ if (!readonly) startPress("insta", i); }} onPointerUp={cancelPress} onPointerLeave={cancelPress}>
            <button className="inline-flex items-center gap-1" onClick={() => openInSameTab(u.url)} title={u.url}>
              <Instagram className="h-3 w-3" /> <span className="break-all">{u.header ?? "אינסטגרם"}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveInsta?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "insta" && editor.index === i && !readonly && (
              <AddDataPopover kind="insta" trigger={<span />} open={true} onOpenChange={(v)=>{ if (!v) setEditor(null); }} initialValue={u} onSave={(val)=>{ onUpdateInsta?.(i, val as { url: string; header?: string }); setEditor(null); }} onDelete={()=>{ onRemoveInsta?.(i); setEditor(null); }} />
            )}
          </div>
        ))}

        {linkedin.map((u, i) => (
          <div key={`lic${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-sky-50 flex-wrap" onContextMenu={(e)=>{ e.preventDefault(); if (!readonly) setEditor({ kind: "linkedin", index: i }); }} onPointerDown={()=>{ if (!readonly) startPress("linkedin", i); }} onPointerUp={cancelPress} onPointerLeave={cancelPress}>
            <button className="inline-flex items-center gap-1" onClick={() => openInSameTab(u.url)} title={u.url}>
              <Linkedin className="h-3 w-3" /> <span className="break-all">לינקדאין</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveLinkedin?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "linkedin" && editor.index === i && !readonly && (
              <AddDataPopover kind="linkedin" trigger={<span />} open={true} onOpenChange={(v)=>{ if (!v) setEditor(null); }} initialValue={u} onSave={(val)=>{ onUpdateLinkedin?.(i, val as { url: string }); setEditor(null); }} onDelete={()=>{ onRemoveLinkedin?.(i); setEditor(null); }} />
            )}
          </div>
        ))}

        {urls.map((u, i) => (
          <div key={`urc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-purple-50 flex-wrap" onContextMenu={(e)=>{ e.preventDefault(); if (!readonly) setEditor({ kind: "url", index: i }); }} onPointerDown={()=>{ if (!readonly) startPress("url", i); }} onPointerUp={cancelPress} onPointerLeave={cancelPress}>
            <button className="inline-flex items-center gap-1" onClick={() => openInSameTab(u.url)} title={u.url}>
              <Globe className="h-3 w-3" /> <span className="break-all">קישור</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveUrl?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "url" && editor.index === i && !readonly && (
              <AddDataPopover kind="url" trigger={<span />} open={true} onOpenChange={(v)=>{ if (!v) setEditor(null); }} initialValue={u} onSave={(val)=>{ onUpdateUrl?.(i, val as { url: string }); setEditor(null); }} onDelete={()=>{ onRemoveUrl?.(i); setEditor(null); }} />
            )}
          </div>
        ))}

        {addr.map((a, i) => (
          <div key={`ad${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-indigo-50 flex-wrap" onContextMenu={(e)=>{ e.preventDefault(); if (!readonly) setEditor({ kind: "address", index: i }); }} onPointerDown={()=>{ if (!readonly) startPress("address", i); }} onPointerUp={cancelPress} onPointerLeave={cancelPress}>
            <button className="inline-flex items-center gap-1" onClick={() => {
              const href = a.lat != null && a.lng != null
                ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.formatted || a.label)}`;
              openInSameTab(href);
            }} title={a.formatted}>
              <MapPin className="h-3 w-3" /> <span className="break-all">{a.label || a.formatted}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveAddress?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {editor?.kind === "address" && editor.index === i && !readonly && (
              <AddDataPopover kind="address" trigger={<span />} open={true} onOpenChange={(v)=>{ if (!v) setEditor(null); }} initialValue={a} onSave={(val)=>{ onUpdateAddress?.(i, val as { formatted: string; label: string; placeId?: string; lat?: number; lng?: number }); setEditor(null); }} onDelete={()=>{ onRemoveAddress?.(i); setEditor(null); }} />
            )}
          </div>
        ))}

        {ds.map((d, i) => {
          const toDate = (v: unknown): v is { toDate: () => Date } => !!v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>);
          const dt = toDate(d.date) ? d.date.toDate() : (d.date instanceof Date ? d.date : undefined);
          const text = dt ? `${d.label} — ${dt.toLocaleDateString()}` : d.label;
          return (
            <span key={`dt${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-amber-50" onContextMenu={(e)=>{ e.preventDefault(); if (!readonly) setEditor({ kind: "date", index: i }); }} onPointerDown={()=>{ if (!readonly) startPress("date", i); }} onPointerUp={cancelPress} onPointerLeave={cancelPress}>
              <Calendar className="h-3 w-3" /> <span className="break-all">{text}</span>
              {editMode && (
                <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveDate?.(i); }} title="הסר">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              {editor?.kind === "date" && editor.index === i && !readonly && (
                <AddDataPopover kind="date" trigger={<span />} open={true} onOpenChange={(v)=>{ if (!v) setEditor(null); }} initialValue={d as { label: string; date: Date | { toDate?: () => Date } }} onSave={(val)=>{ onUpdateDate?.(i, val as { label: string; date: Date | { toDate?: () => Date } }); setEditor(null); }} onDelete={()=>{ onRemoveDate?.(i); setEditor(null); }} />
              )}
            </span>
          );
        })}
      </div>

      {!readonly && (onAddPhone || onAddEmail || onAddInsta || onAddLinkedin || onAddUrl || onAddAddress || onAddDate) && (
        <div className="flex flex-wrap gap-2">
          {onAddPhone && <AddButton label="טלפון" color="emerald" onClick={onAddPhone} />}
          {onAddEmail && <AddButton label="אימייל" color="blue" onClick={onAddEmail} />}
          {onAddInsta && <AddButton label="אינסטגרם" color="pink" onClick={onAddInsta} />}
          {onAddLinkedin && <AddButton label="לינקדאין" color="sky" onClick={onAddLinkedin} />}
          {onAddUrl && <AddButton label="קישור" color="purple" onClick={onAddUrl} />}
          {onAddAddress && <AddButton label="כתובת" color="indigo" onClick={onAddAddress} />}
          {onAddDate && <AddButton label="תאריך חדש" color="amber" onClick={onAddDate} />}
        </div>
      )}
    </div>
  );
}

function AddButton({ label, color, onClick }: { label: string; color: string; onClick?: () => void }) {
  return (
    <button className={`inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs hover:bg-${color}-50`} onClick={onClick}>
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}


