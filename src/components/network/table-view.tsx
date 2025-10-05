"use client";
import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { EntityDoc } from "@/types/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";
import { TagChips } from "@/components/tags/tag-chips";
import { auth } from "@/lib/firebase";
import { TypeChip } from "@/components/network/type-chip";
import { ContactIcons } from "@/components/entity/contact-chips";

function SharedChip() {
  return <span className="text-[10px] ms-2 rounded-full border px-2 py-0.5 bg-white text-foreground/80">משותף</span>;
}

function ContactIconsCell({ e }: { e: EntityDoc }) {
  return <ContactIcons contact={e.contact} />;
}

export function EntitiesTable({ rows, onOpen, onEndReached, selectedIds, onToggle, onToggleAll }: { rows: (EntityDoc & { id: string })[]; onOpen?: (id: string) => void; onEndReached?: () => void; selectedIds?: Set<string>; onToggle?: (id: string, checked: boolean) => void; onToggleAll?: (checked: boolean) => void }) {
  const allSelected = selectedIds ? rows.length > 0 && rows.every(r => selectedIds.has(r.id)) : false;
  const uid = auth.currentUser?.uid;
  const columns = useMemo<ColumnDef<EntityDoc & { id: string }>[]>(() => [
    {
      id: "select",
      header: () => (
        <AnimatedCheckbox size="xs" checked={allSelected} onCheckedChange={(v) => onToggleAll?.(Boolean(v))} />
      ),
      cell: ({ row }) => (
        <AnimatedCheckbox size="xs" checked={selectedIds?.has(row.original.id) ?? false} onCheckedChange={(v) => onToggle?.(row.original.id, Boolean(v))} onClick={(ev)=>ev.stopPropagation()} />
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
    { header: "יצירת קשר", id: "contact", cell: ({ row }) => <ContactIconsCell e={row.original} /> },
  ], [allSelected, onToggleAll, onToggle, selectedIds, uid]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-lg border overflow-auto mb-8" onScroll={(e) => {
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


