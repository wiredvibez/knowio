"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { TagPicker } from "@/components/pickers/tag-picker";
import { AddEntityDialog } from "@/components/entity/add-entity-dialog";

export type TagFilters = { from: string[]; relationship: string[]; character: string[]; field: string[] };

export function NetworkHeader({
  types,
  onTypesChange,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
}: {
  types: string[];
  onTypesChange: (t: string[]) => void;
  filters: TagFilters;
  onFiltersChange: (f: TagFilters) => void;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  const typeOptions = ["person", "organization", "community", "shared"];
  const [openCat, setOpenCat] = useState<null | "from" | "relationship" | "character" | "field">(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
    <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 flex flex-wrap items-center gap-2">
        <Button size="lg" className="rounded-xl" onClick={() => setAddOpen(true)}>+</Button>
        <div className="h-6 w-px bg-border" />
        {typeOptions.map((t) => (
          <Badge
            key={t}
            variant={types.includes(t) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() =>
              onTypesChange(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])
            }
          >
            {t}
          </Badge>
        ))}
        {/* <div className="h-6 w-px bg-border" /> */}
        {/* <Badge variant="outline" className="opacity-50">מיון</Badge>
        <Badge variant="outline" className="opacity-50">סינון</Badge>
        <Badge variant="outline" className="opacity-50">הסתרה</Badge> */}
        <div className="h-6 w-px bg-border" />
        {(["from","relationship","character","field"] as const).map((cat) => (
          <Badge key={cat} variant="outline" className="cursor-pointer" onClick={() => setOpenCat(cat)}>
            {cat}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="h-10 rounded-md border px-3 text-sm"
          placeholder="חיפוש"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
    <TagPicker
      category={openCat ?? "from"}
      open={openCat !== null}
      onOpenChange={(v) => !v && setOpenCat(null)}
      selected={openCat ? filters[openCat] : []}
      onChange={(next) => openCat && onFiltersChange({ ...filters, [openCat]: next } as TagFilters)}
      mode="filter"
    />
    <AddEntityDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}


