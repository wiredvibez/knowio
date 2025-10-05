"use client";
import type { EntityDoc } from "@/types/firestore";
import { Phone, Mail, Globe, Instagram, Linkedin, MessageCircle, Plus, MapPin, Calendar, Trash2 } from "lucide-react";

type Contact = EntityDoc["contact"];

function openInNewTab(url?: string) {
  if (!url) return;
  const href = url.startsWith("http") ? url : `https://${url}`;
  window.open(href, "_blank");
}

function whatsapp(e164: string) {
  const num = (e164 || "").replace(/^\+/, "");
  if (!num) return;
  window.open(`https://wa.me/${num}`, "_blank");
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
        <button key={`ig${i}`} className="p-1 rounded hover:bg-pink-100" title={u.url} onClick={() => openInNewTab(u.url)}>
          <Instagram className="h-4 w-4" />
        </button>
      ))}
      {linkedin.slice(0, 1).map((u, i) => (
        <button key={`li${i}`} className="p-1 rounded hover:bg-sky-100" title={u.url} onClick={() => openInNewTab(u.url)}>
          <Linkedin className="h-4 w-4" />
        </button>
      ))}
      {urls.slice(0, 2).map((u, i) => (
        <button key={`ur${i}`} className="p-1 rounded hover:bg-purple-100" title={u.url} onClick={() => openInNewTab(u.url)}>
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
}) {
  const phones = contact?.phone ?? [];
  const emails = contact?.email ?? [];
  const insta = contact?.insta ?? [];
  const linkedin = contact?.linkedin ?? [];
  const urls = contact?.url ?? [];
  const addr = addresses ?? [];
  const ds = dates ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {phones.map((p, i) => (
          <div key={`phc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-emerald-50 flex-wrap">
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
          </div>
        ))}

        {emails.map((m, i) => (
          <div key={`emc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-blue-50 flex-wrap">
            <button className="inline-flex items-center gap-1" onClick={() => mail(m.address)} title={m.address}>
              <Mail className="h-3 w-3" />
              <span className="break-all">{m.address}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveEmail?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {insta.map((u, i) => (
          <div key={`igc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-pink-50 flex-wrap">
            <button className="inline-flex items-center gap-1" onClick={() => openInNewTab(u.url)} title={u.url}>
              <Instagram className="h-3 w-3" /> <span className="break-all">{u.header ?? "אינסטגרם"}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveInsta?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {linkedin.map((u, i) => (
          <div key={`lic${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-sky-50 flex-wrap">
            <button className="inline-flex items-center gap-1" onClick={() => openInNewTab(u.url)} title={u.url}>
              <Linkedin className="h-3 w-3" /> <span className="break-all">לינקדאין</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveLinkedin?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {urls.map((u, i) => (
          <div key={`urc${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-purple-50 flex-wrap">
            <button className="inline-flex items-center gap-1" onClick={() => openInNewTab(u.url)} title={u.url}>
              <Globe className="h-3 w-3" /> <span className="break-all">קישור</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveUrl?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {addr.map((a, i) => (
          <div key={`ad${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-indigo-50 flex-wrap">
            <button className="inline-flex items-center gap-1" onClick={() => {
              const href = a.lat != null && a.lng != null
                ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.formatted || a.label)}`;
              openInNewTab(href);
            }} title={a.formatted}>
              <MapPin className="h-3 w-3" /> <span className="break-all">{a.label || a.formatted}</span>
            </button>
            {editMode && (
              <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveAddress?.(i); }} title="הסר">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {ds.map((d, i) => {
          const toDate = (v: unknown): v is { toDate: () => Date } => !!v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>);
          const dt = toDate(d.date) ? d.date.toDate() : (d.date instanceof Date ? d.date : undefined);
          const text = dt ? `${d.label} — ${dt.toLocaleDateString()}` : d.label;
          return (
            <span key={`dt${i}`} className="relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-amber-50">
              <Calendar className="h-3 w-3" /> <span className="break-all">{text}</span>
              {editMode && (
                <button className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white/90 border" onClick={(e) => { e.stopPropagation(); onRemoveDate?.(i); }} title="הסר">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {!readonly && (
        <div className="flex flex-wrap gap-2">
          <AddButton label="טלפון" color="emerald" onClick={onAddPhone} />
          <AddButton label="אימייל" color="blue" onClick={onAddEmail} />
          <AddButton label="אינסטגרם" color="pink" onClick={onAddInsta} />
          <AddButton label="לינקדאין" color="sky" onClick={onAddLinkedin} />
          <AddButton label="קישור" color="purple" onClick={onAddUrl} />
          <AddButton label="כתובת" color="indigo" onClick={onAddAddress} />
          <AddButton label="תאריך חדש" color="amber" onClick={onAddDate} />
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


