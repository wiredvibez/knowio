"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { TagPicker } from "@/components/pickers/tag-picker";
import { CATEGORY_LABELS } from "@/constants/tags";
import { AddEntityDialog } from "@/components/entity/add-entity-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewInteractionForm } from "@/components/entity/interactions";

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
  const [interactionOpen, setInteractionOpen] = useState(false);

  return (
    <>
    <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 flex flex-wrap items-center gap-2">
        <Button size="lg" className="rounded-xl" onClick={() => setAddOpen(true)}>+</Button>
        <Popover open={interactionOpen} onOpenChange={setInteractionOpen}>
          <PopoverTrigger asChild>
            <Button size="lg" variant="outline" className="rounded-xl">+ אינטראקציה</Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-[520px] max-w-[calc(100vw-1rem)] p-3">
            <NewInteractionForm
              onCancel={() => setInteractionOpen(false)}
              onCreated={() => setInteractionOpen(false)}
            />
          </PopoverContent>
        </Popover>
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
        {(["from","relationship","character","field"] as const).map((cat) => {
          const selected = filters[cat];
          const has = selected.length > 0;
          return (
            <div key={cat} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${has ? "bg-muted" : ""}`}>
              <span className="text-sm cursor-pointer" onClick={() => setOpenCat(cat)}>{CATEGORY_LABELS[cat]}</span>
              {has && (
                <div className="flex items-center gap-1">
                  {selected.map((t, idx) => (
                    <span key={t} className="text-xs">
                      {t}{idx < selected.length - 1 ? " | " : ""}
                    </span>
                  ))}
                  <button
                    className="text-xs rounded border px-1"
                    title="הסר את כל המסננים"
                    onClick={() => onFiltersChange({ ...filters, [cat]: [] } as TagFilters)}
                  >×</button>
                </div>
              )}
              <button className="text-xs rounded border px-1" title="הוסף" onClick={() => setOpenCat(cat)}>+</button>
            </div>
          );
        })}
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


