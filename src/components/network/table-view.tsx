"use client";
import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { EntityDoc } from "@/types/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TagChips } from "@/components/tags/tag-chips";
import { Phone, Mail, Globe, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { TypeChip } from "@/components/network/type-chip";

function SharedChip() {
  return <span className="text-[10px] ms-2 rounded-full border px-2 py-0.5 bg-white text-foreground/80">משותף</span>;
}

function ContactIcons({ e }: { e: EntityDoc }) {
  const phones = e.contact?.phone ?? [];
  const emails = e.contact?.email ?? [];
  const openWa = (e164: string) => {
    const num = e164.replace(/^\+/, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };
  const tel = (e164: string) => {
    window.location.href = `tel:${e164}`;
  };
  const mail = (addr: string) => {
    window.location.href = `mailto:${addr}`;
  };
  const go = (url: { url?: string } | string) => {
    const u = typeof url === 'string' ? url : (url?.url as string);
    if (!u) return;
    const href = u.startsWith("http") ? u : `https://${u}`;
    window.open(href, "_blank");
  };
  return (
    <div className="flex items-center gap-2">
      {phones.slice(0, 2).map((p, i) => (
        <div key={`ph${i}`} className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-muted" title={p.e164} onClick={() => openWa(p.e164)}>
            <MessageCircle className="h-4 w-4" />
          </button>
          <button className="p-1 rounded hover:bg-muted" title={p.e164} onClick={() => tel(p.e164)}>
            <Phone className="h-4 w-4" />
          </button>
        </div>
      ))}
      {emails.slice(0, 2).map((m, i) => (
        <button key={`em${i}`} className="p-1 rounded hover:bg-muted" title={m.address} onClick={() => mail(m.address)}>
          <Mail className="h-4 w-4" />
        </button>
      ))}
      {(e.contact?.insta ?? []).slice(0, 1).map((u, i) => (
        <button key={`ig${i}`} className="p-1 rounded hover:bg-muted" title={u.url} onClick={() => go(u)}>
          <Instagram className="h-4 w-4" />
        </button>
      ))}
      {(e.contact?.linkedin ?? []).slice(0, 1).map((u, i) => (
        <button key={`li${i}`} className="p-1 rounded hover:bg-muted" title={u.url} onClick={() => go(u)}>
          <Linkedin className="h-4 w-4" />
        </button>
      ))}
      {(e.contact?.url ?? []).slice(0, 2).map((u, i) => (
        <button key={`ur${i}`} className="p-1 rounded hover:bg-muted" title={u.url} onClick={() => go(u)}>
          <Globe className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function EntitiesTable({ rows, onOpen, onEndReached, selectedIds, onToggle, onToggleAll }: { rows: (EntityDoc & { id: string })[]; onOpen?: (id: string) => void; onEndReached?: () => void; selectedIds?: Set<string>; onToggle?: (id: string, checked: boolean) => void; onToggleAll?: (checked: boolean) => void }) {
  const allSelected = selectedIds ? rows.length > 0 && rows.every(r => selectedIds.has(r.id)) : false;
  const uid = auth.currentUser?.uid;
  const columns = useMemo<ColumnDef<EntityDoc & { id: string }>[]>(() => [
    {
      id: "select",
      header: () => (
        <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll?.(e.currentTarget.checked)} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={selectedIds?.has(row.original.id) ?? false} onChange={(e) => onToggle?.(row.original.id, e.currentTarget.checked)} onClick={(ev)=>ev.stopPropagation()} />
      ),
    },
    {
      header: "שם",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="truncate max-w-[240px]" title={row.original.name}>{row.original.name}</span>
          <TypeChip type={row.original.type} />
          {uid && row.original.owner_id !== uid ? <SharedChip /> : null}
        </div>
      ),
    },
    { header: "תגיות מקור", accessorKey: "from", cell: ({ getValue }) => <TagChips category="from" ids={(getValue<string[]>() ?? []).slice(0,5)} /> },
    { header: "מערכת יחסים", accessorKey: "relationship", cell: ({ getValue }) => <TagChips category="relationship" ids={(getValue<string[]>() ?? []).slice(0,5)} /> },
    { header: "תכונות ואישיות", accessorKey: "character", cell: ({ getValue }) => <TagChips category="character" ids={(getValue<string[]>() ?? []).slice(0,5)} /> },
    { header: "מקצוע, כלים ותוכן", accessorKey: "field", cell: ({ getValue }) => <TagChips category="field" ids={(getValue<string[]>() ?? []).slice(0,5)} /> },
    { header: "יצירת קשר", id: "contact", cell: ({ row }) => <ContactIcons e={row.original} /> },
  ], [allSelected, onToggleAll, onToggle, selectedIds, uid]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-lg border overflow-auto" onScroll={(e) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) onEndReached?.();
    }}>
      <Table>
        <TableHeader className="text-right">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="whitespace-nowrap text-right">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="h-9 cursor-pointer" onClick={() => onOpen?.(row.original.id)}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-1">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


