"use client";
import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { EntityDoc } from "@/types/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function EntitiesTable({ rows, onOpen }: { rows: (EntityDoc & { id: string })[]; onOpen?: (id: string) => void }) {
  const columns = useMemo<ColumnDef<any>[]>(() => [
    { header: "שם", accessorKey: "name" },
    { header: "סוג", accessorKey: "type" },
    { header: "תגיות מקור", accessorKey: "from", cell: ({ getValue }) => (getValue<any[]>() ?? []).slice(0,5).join(", ") },
    { header: "קשר", accessorKey: "relationship", cell: ({ getValue }) => (getValue<any[]>() ?? []).slice(0,5).join(", ") },
    { header: "אופי", accessorKey: "character", cell: ({ getValue }) => (getValue<any[]>() ?? []).slice(0,5).join(", ") },
    { header: "תחום", accessorKey: "field", cell: ({ getValue }) => (getValue<any[]>() ?? []).slice(0,5).join(", ") },
  ], []);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="whitespace-nowrap">
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


