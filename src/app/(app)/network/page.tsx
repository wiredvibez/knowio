"use client";
import { NetworkHeader, TagFilters } from "@/components/network/network-header";
import { ActionBar } from "@/components/network/action-bar";
import { useMemo, useState } from "react";
import { useEntities } from "@/hooks/useEntities";
import { EntitiesTable } from "@/components/network/table-view";
import { ViewToggle } from "@/components/network/view-toggle";
import { EntityOverlay } from "@/components/entity/entity-overlay";
import { EntitiesCards } from "@/components/network/cards-view";
import { useRouter, useSearchParams } from "next/navigation";
import { ShareDialog } from "@/components/network/share-dialog";

export default function NetworkPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<TagFilters>({ from: [], relationship: [], character: [], field: [] });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const searchParams = useSearchParams();
  const router = useRouter();
  const openId = searchParams.get("entity") || undefined;
  const { rows, loadMore } = useEntities({ types, filters });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">הרשת</h1>
      <hr />
      <NetworkHeader
        types={types}
        onTypesChange={setTypes}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
      />
      <ActionBar onShare={() => setShareOpen(true)} disabled={selected.size === 0} />
      <div className="flex items-center gap-3">
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === "table" ? (
        <EntitiesTable
          rows={rows}
          onEndReached={loadMore}
          selectedIds={selected}
          onToggle={(id, checked) => setSelected((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; })}
          onToggleAll={(checked) => setSelected(checked ? new Set(rows.map(r=>r.id)) : new Set())}
          onOpen={(id) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("entity", id);
            router.replace(`/network?${sp.toString()}`);
          }}
        />
      ) : (
        <EntitiesCards
          rows={rows}
          onOpen={(id) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("entity", id);
            router.replace(`/network?${sp.toString()}`);
          }}
        />
      )}
      <EntityOverlay
        open={!!openId}
        onOpenChange={(v) => {
          if (!v) {
            const sp = new URLSearchParams(searchParams.toString());
            sp.delete("entity");
            router.replace(`/network${sp.toString() ? `?${sp.toString()}` : ""}`);
          }
        }}
        entityId={openId}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} entityIds={selectedArray} />
    </div>
  );
}


