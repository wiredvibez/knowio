"use client";
import { NetworkHeader, TagFilters } from "@/components/network/network-header";
import { ActionBar } from "@/components/network/action-bar";
import { useState } from "react";
import { useEntities } from "@/hooks/useEntities";
import { EntitiesTable } from "@/components/network/table-view";
import { ViewToggle } from "@/components/network/view-toggle";
import { EntityOverlay } from "@/components/entity/entity-overlay";

export default function NetworkPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<TagFilters>({ from: [], relationship: [], character: [], field: [] });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [openId, setOpenId] = useState<string | undefined>();
  const { rows } = useEntities({ types, filters });
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">הרשת</h1>
      <NetworkHeader
        types={types}
        onTypesChange={setTypes}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
      />
      <ActionBar onShare={() => {}} />
      <div className="flex items-center gap-3">
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === "table" ? (
        <EntitiesTable rows={rows} onOpen={(id) => setOpenId(id)} />
      ) : (
        <div className="text-sm text-muted-foreground">תצוגת כרטיסים (בקרוב)</div>
      )}
      <EntityOverlay open={!!openId} onOpenChange={(v) => !v && setOpenId(undefined)} entityId={openId} />
    </div>
  );
}


