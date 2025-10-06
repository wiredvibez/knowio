"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkHeader, TagFilters } from "@/components/network/network-header";
import { ActionBar } from "@/components/network/action-bar";
import { db, auth } from "@/lib/firebase";
import { collection, doc, documentId, getDoc, getDocs, query, where, writeBatch, serverTimestamp, increment, setDoc, updateDoc } from "firebase/firestore";
import { bestTextTone, generatePastelHex } from "@/lib/colors";
import { normalizePhoneToE164 } from "@/lib/utils";
import { useMemo, useRef, useState, useEffect } from "react";
import { BrandHeader } from "@/components/nav/brand-header";
import { useEntities } from "@/hooks/useEntities";
import { EntitiesTable } from "@/components/network/table-view";
import { ViewToggle } from "@/components/network/view-toggle";
import { EntityOverlay } from "@/components/entity/entity-overlay";
import { EntitiesCards } from "@/components/network/cards-view";
import { useRouter, useSearchParams } from "next/navigation";
import { ShareDialog } from "@/components/network/share-dialog";
import { useUserDoc } from "@/hooks/useUserDoc";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteEntities } from "@/lib/deleteEntity";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function NetworkPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<TagFilters>({ from: [], relationship: [], character: [], field: [] });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const searchParams = useSearchParams();
  const router = useRouter();
  const openId = searchParams.get("entity") || undefined;
  const { rows, loadMore, loadingMore } = useEntities({ types, filters });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const [shareOpen, setShareOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<null | { created: number; updated: number; skipped: number; errors: number; errorNames?: string[] }>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Duplicate-name resolution modal state
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [duplicateList, setDuplicateList] = useState<{ name: string; existingId: string }[]>([]);
  const [duplicateChoice, setDuplicateChoice] = useState<Record<string, 'override' | 'create'>>({});
  const [pendingImport, setPendingImport] = useState<null | { headers: string[]; hIdx: Record<string, number>; dataRows: string[][] }>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<null | { deleted: number; skippedNotOwner: number; errors: number }>(null);
  const { user } = useUserDoc();
  const viewInitializedRef = useRef(false);
  useEffect(() => {
    function onOpenDelete(e: Event) {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids || [];
      if (ids.length > 0) {
        setSelected(new Set(ids));
        setDeleteOpen(true);
      }
    }
    window.addEventListener('open-delete-entities', onOpenDelete as EventListener);
    return () => window.removeEventListener('open-delete-entities', onOpenDelete as EventListener);
  }, []);

  useEffect(() => {
    if (viewInitializedRef.current) return;
    const pref = (user?.preferences as { network_view?: "table" | "cards" } | undefined)?.network_view;
    if (pref === "table" || pref === "cards") {
      setView(pref);
      viewInitializedRef.current = true;
    }
  }, [user]);

  async function handleViewChange(next: "table" | "cards") {
    setView(next);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), { ["preferences.network_view"]: next } as Record<string, unknown>);
    } catch {
      // noop: best-effort save
    }
  }

  async function exportSelected() {
    if (selectedArray.length === 0) return;
    const selectedEntities = rows.filter((r) => selected.has(r.id));
    // Load tag names for each category
    async function loadNames(category: "from" | "relationship" | "character" | "field", ids: string[]): Promise<Record<string, string>> {
      const out: Record<string, string> = {};
      if (!ids.length) return out;
      const coll = collection(db, `picker_${category}`);
      // chunk by 10 for IN query
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);
        const q = query(coll, where(documentId(), 'in', chunk as string[]));
        const snap = await getDocs(q);
        snap.forEach((d) => { out[d.id] = (d.data() as any)?.name ?? d.id; });
      }
      return out;
    }

    // Gather all unique tag ids by category from selected
    const catIds: Record<"from" | "relationship" | "character" | "field", Set<string>> = {
      from: new Set(), relationship: new Set(), character: new Set(), field: new Set(),
    };
    for (const e of selectedEntities) {
      (['from','relationship','character','field'] as const).forEach((cat) => {
        for (const id of (e[cat] ?? []) as string[]) catIds[cat].add(id);
      });
    }
    const [fromNames, relationshipNames, characterNames, fieldNames] = await Promise.all([
      loadNames('from', Array.from(catIds.from)),
      loadNames('relationship', Array.from(catIds.relationship)),
      loadNames('character', Array.from(catIds.character)),
      loadNames('field', Array.from(catIds.field)),
    ]);

    function idsToNames(ids?: string[], map?: Record<string, string>): string[] {
      if (!ids || !map) return [];
      return ids.map((id) => map[id] ?? id);
    }

    function contactList<T extends { [k: string]: any }>(arr: T[] | undefined, picker: (x: T) => string | undefined): string[] {
      if (!arr) return [];
      const out: string[] = [];
      for (const item of arr) {
        const v = picker(item);
        if (v) out.push(v);
      }
      return out;
    }

    function datesToList(dates?: { label: string; date: any }[]): string[] {
      if (!dates) return [];
      const out: string[] = [];
      for (const d of dates) {
        const ts: any = d?.date as any;
        const iso = typeof ts?.toDate === 'function' ? ts.toDate().toISOString().slice(0,10) : '';
        if (d.label && iso) out.push(`${d.label}:${iso}`);
      }
      return out;
    }

    const headers = [
      'entity_id','name','type','info','from','relationship','character','field','phones_e164','emails','insta_urls','linkedin_urls','urls','other_contacts','addresses','dates'
    ];
    const lines: string[] = [];
    lines.push(headers.join(','));

    function csvEscape(value: string): string {
      if (value == null) return '';
      // Always quote lists and JSON; simple fields only quote if needed
      if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
      return value;
    }

    function listCell(items: string[]): string {
      const joined = items.join(', ');
      return '"' + joined.replace(/"/g, '""') + '"';
    }

    for (const e of selectedEntities) {
      const row: string[] = [];
      row.push(csvEscape(e.id));
      row.push(csvEscape(e.name ?? ''));
      row.push(csvEscape(e.type ?? 'person'));
      row.push(csvEscape(e.info ?? ''));
      row.push(listCell(idsToNames(e.from as string[], fromNames)));
      row.push(listCell(idsToNames(e.relationship as string[], relationshipNames)));
      row.push(listCell(idsToNames(e.character as string[], characterNames)));
      row.push(listCell(idsToNames(e.field as string[], fieldNames)));
      row.push(listCell(contactList(e.contact?.phone, (p) => p?.e164)));
      row.push(listCell(contactList(e.contact?.email, (p) => p?.address)));
      row.push(listCell(contactList(e.contact?.insta, (p) => p?.url)));
      row.push(listCell(contactList(e.contact?.linkedin, (p) => p?.url)));
      row.push(listCell(contactList(e.contact?.url, (p) => p?.url)));
      row.push(listCell(contactList(e.contact?.other, (p) => p?.text)));
      const addressesJson = JSON.stringify((e.addresses ?? []).map((a) => ({ formatted: a.formatted, label: a.label, placeId: a.placeId, lat: a.lat, lng: a.lng })));
      row.push(csvEscape(addressesJson));
      row.push(listCell(datesToList(e.dates as any)));
      lines.push(row.join(','));
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entities-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    // Simple CSV parser that handles quoted cells and commas
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
    function split(line: string): string[] {
      const out: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') {
            if (line[i+1] === '"') { cur += '"'; i++; }
            else { inQ = false; }
          } else { cur += ch; }
        } else {
          if (ch === '"') { inQ = true; }
          else if (ch === ',') { out.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
      }
      out.push(cur.trim());
      return out;
    }
    const headers = split(lines[0]);
    const rows = lines.slice(1).map(split);
    return { headers, rows };
  }

  function listFromCell(cell: string): string[] {
    const t = (cell || '').trim();
    if (!t) return [];
    // Already parsed by CSV; we just need to split by comma
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function normalizeInstagram(raw: string): string | undefined {
    const v = (raw || '').trim();
    if (!v) return undefined;
    if (/^https?:\/\//i.test(v)) return v;
    const m = v.match(/^@?([A-Za-z0-9_.]{1,30})$/);
    if (m) return `https://instagram.com/${m[1]}`;
    return undefined;
  }

  async function ensureTags(category: 'from' | 'relationship' | 'character' | 'field', names: string[], uid: string): Promise<string[]> {
    const ids: string[] = [];
    const coll = collection(db, `picker_${category}`);
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const normalizedId = trimmed
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[\/]+/g, "_");
      const ref = doc(coll, normalizedId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const color = generatePastelHex();
        const text_color = bestTextTone(color);
        await setDoc(ref, { name: trimmed, color, text_color, usage_count: 0, created_by: uid, created_at: serverTimestamp() } as any);
      }
      ids.push(ref.id);
    }
    return ids;
  }

  function computeTagDiffs(prev: string[] | undefined, next: string[]): { add: string[]; remove: string[] } {
    const p = new Set(prev ?? []);
    const n = new Set(next);
    const add: string[] = [];
    const remove: string[] = [];
    for (const id of n) if (!p.has(id)) add.push(id);
    for (const id of p) if (!n.has(id)) remove.push(id);
    return { add, remove };
  }

  async function importEntities() {
    // Open file chooser via hidden input
    if (!fileInputRef.current) {
      fileInputRef.current = document.createElement('input');
    }
    const input = fileInputRef.current;
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { return; }
      setImporting(true);
      const text = await file.text();
      // Validate CSV
      let parsed: { headers: string[]; rows: string[][] };
      try { parsed = parseCsv(text); } catch { setErrorMsg('CSV parse error. Please check quoting and commas.'); setErrorOpen(true); setImporting(false); input.value = ''; input.remove(); return; }
      const { headers, rows: dataRows } = parsed;
      const expected = ['entity_id','name','type','info','from','relationship','character','field','phones_e164','emails','insta_urls','linkedin_urls','urls','other_contacts','addresses','dates'];
      const missing = expected.filter((h) => !headers.includes(h));
      if (missing.length) { setErrorMsg(`Missing headers: ${missing.join(', ')}`); setErrorOpen(true); setImporting(false); input.value=''; input.remove(); return; }
      const hIdx: Record<string, number> = Object.create(null);
      headers.forEach((h, i) => { hIdx[h] = i; });
        // Detect duplicate names (rows without entity_id but with a name matching an owned entity)
        const uid = auth.currentUser?.uid as string;
        const namesToCheck = new Set<string>();
        for (const cols of dataRows) {
          const entityId = (cols[hIdx['entity_id']] || '').trim();
          const name = (cols[hIdx['name']] || '').trim();
          if (!entityId && name) namesToCheck.add(name);
        }
        const nameArr = Array.from(namesToCheck);
        const duplicates: { name: string; existingId: string }[] = [];
        const nameToExistingId: Record<string, string> = {};
        // Firestore 'in' supports up to 30 values; chunk by 10 for safety
        const coll = collection(db, 'entities');
        for (let i = 0; i < nameArr.length; i += 10) {
          const chunk = nameArr.slice(i, i + 10);
          if (chunk.length === 0) continue;
          try {
            const q = query(coll, where('owner_id', '==', uid), where('name', 'in', chunk as string[]));
            const snap = await getDocs(q);
            snap.forEach((d) => {
              const data = d.data() as any;
              const nm = (data?.name || '').trim();
              if (nm && !nameToExistingId[nm]) {
                nameToExistingId[nm] = d.id;
                duplicates.push({ name: nm, existingId: d.id });
              }
            });
          } catch {
            // If index is missing or query fails, fallback: skip duplicate check and proceed
          }
        }

      // Prepare to continue import after user resolves duplicates
      setPendingImport({ headers, hIdx, dataRows });
      input.value = '';
      input.remove();

      if (duplicates.length > 0) {
        const choices: Record<string, 'override' | 'create'> = {};
        for (const d of duplicates) choices[d.name] = 'override';
        setDuplicateChoice(choices);
        setDuplicateList(duplicates);
        setDuplicatesOpen(true);
        setImporting(false);
        return;
      }

      // No duplicates — proceed immediately with default behavior
      await continueImportWithChoices({ headers, hIdx, dataRows });
    };
    input.click();
  }

  async function continueImportWithChoices(context: { headers: string[]; hIdx: Record<string, number>; dataRows: string[][] }) {
    const { headers, hIdx, dataRows } = context;
    let created = 0, updated = 0, skipped = 0, errors = 0;
    const errorNames: string[] = [];
    const uid = auth.currentUser?.uid as string;
    setImporting(true);

    // Build a helper map of name -> existingId using duplicateList if provided in choices
    const mapNameToExistingId: Record<string, string> = {};
    for (const d of duplicateList) mapNameToExistingId[d.name] = d.existingId;

    const chunkSize = 300;
    for (let start = 0; start < dataRows.length; start += chunkSize) {
      const chunk = dataRows.slice(start, start + chunkSize);
      const b = writeBatch(db);

      for (const cols of chunk) {
        try {
          if (!cols || cols.length < headers.length) { errors++; continue; }
          const entityId = (cols[hIdx['entity_id']] || '').trim();
          const name = (cols[hIdx['name']] || '').trim();
          const type = ((cols[hIdx['type']] || '').trim() || 'person') as any;
          const info = (cols[hIdx['info']] || '').trim();
          if (!entityId && !name) { skipped++; continue; }

          const fromNames = listFromCell(cols[hIdx['from']]);
          const relationshipNames = listFromCell(cols[hIdx['relationship']]);
          const characterNames = listFromCell(cols[hIdx['character']]);
          const fieldNames = listFromCell(cols[hIdx['field']]);

          const fromIds = await ensureTags('from', fromNames, uid);
          const relationshipIds = await ensureTags('relationship', relationshipNames, uid);
          const characterIds = await ensureTags('character', characterNames, uid);
          const fieldIds = await ensureTags('field', fieldNames, uid);

          const phones = listFromCell(cols[hIdx['phones_e164']]).map((raw) => {
            const { e164 } = normalizePhoneToE164(raw);
            return { e164: e164 ?? '' };
          }).filter((p) => (p.e164 || '').trim().length > 0);
          const emails = listFromCell(cols[hIdx['emails']]).map((address) => ({ address }));
          const insta = listFromCell(cols[hIdx['insta_urls']])
            .map((s) => normalizeInstagram(s))
            .filter(Boolean)
            .map((url) => ({ url: url as string }));
          const linkedin = listFromCell(cols[hIdx['linkedin_urls']]).map((url) => ({ url }));
          const urls = listFromCell(cols[hIdx['urls']]).map((url) => ({ url }));
          const other = listFromCell(cols[hIdx['other_contacts']]).map((text) => ({ text }));
          const addressesCell = (cols[hIdx['addresses']] || '').trim();
          let addresses: any[] = [];
          if (addressesCell) {
            try {
              const parsedAddr = JSON.parse(addressesCell);
              if (!Array.isArray(parsedAddr)) throw new Error('addresses must be a JSON array');
              addresses = parsedAddr;
            } catch (err) {
              // Debug specific row details to help diagnose parse failures
              try {
                const rowObj: Record<string, string> = {};
                for (let i = 0; i < headers.length; i++) rowObj[headers[i]] = cols[i] ?? '';
                console.error('Import error: invalid addresses JSON', { error: err, name, entityId, addressesCell, row: rowObj });
              } catch {}
              setErrorMsg('Invalid addresses JSON in one or more rows. Import canceled.');
              setErrorOpen(true);
              setImporting(false);
              return;
            }
          }
          const datesList = listFromCell(cols[hIdx['dates']]);
          const dates = datesList.map((p) => {
            const idx = p.lastIndexOf(':');
            if (idx <= 0) return null;
            const label = p.slice(0, idx).trim();
            const date = p.slice(idx + 1).trim();
            const d = new Date(date + 'T00:00:00Z');
            if (isNaN(d.getTime())) return null;
            return { label, date: d };
          }).filter(Boolean) as any[];

          // Resolve target entity ref by precedence:
          // 1) entity_id if provided
          // 2) duplicate-name with choice 'override' -> existing doc
          // 3) create new
          let targetRef = entityId ? doc(collection(db, 'entities'), entityId) : doc(collection(db, 'entities'));
          let exists = false;
          let prevData: any = null;
          if (entityId) {
            const snap = await getDoc(targetRef);
            if (snap.exists()) {
              const ownerId = (snap.data() as any)?.owner_id;
              if (ownerId && ownerId !== uid) { skipped++; continue; }
              exists = true;
              prevData = snap.data();
            }
          } else if (name && duplicateChoice[name] === 'override' && mapNameToExistingId[name]) {
            targetRef = doc(collection(db, 'entities'), mapNameToExistingId[name]);
            const snap = await getDoc(targetRef);
            if (snap.exists()) {
              exists = true;
              prevData = snap.data();
            }
          } else {
            exists = false;
          }

          // computeTagDiffs used below for usage_count updates

          const payload: any = {
            type,
            name: name || ' ',
            info,
            from: fromIds,
            relationship: relationshipIds,
            character: characterIds,
            field: fieldIds,
            contact: { phone: phones, email: emails, insta, linkedin, url: urls, other },
            addresses,
            dates: dates,
            owner_id: uid,
            updated_at: serverTimestamp(),
          };
          if (!exists) payload.created_at = serverTimestamp();

          if (exists) { b.update(targetRef, payload); updated++; }
          else { b.set(targetRef, payload, { merge: true }); created++; }

          // Tag increments/decrements by category
          const catTuples: Array<[ 'from' | 'relationship' | 'character' | 'field', string[] ]> = [
            ['from', fromIds], ['relationship', relationshipIds], ['character', characterIds], ['field', fieldIds]
          ];
          if (exists) {
            const prev = prevData as any;
            for (const [cat, nextIds] of catTuples) {
              const dif = computeTagDiffs(prev?.[cat], nextIds);
              for (const id of dif.add) b.update(doc(collection(db, `picker_${cat}`), id), { usage_count: increment(1) });
              for (const id of dif.remove) b.update(doc(collection(db, `picker_${cat}`), id), { usage_count: increment(-1) });
            }
          } else {
            for (const [cat, nextIds] of catTuples) {
              for (const id of nextIds) b.update(doc(collection(db, `picker_${cat}`), id), { usage_count: increment(1) });
            }
          }

        } catch (err) {
          errors++;
          const nm = (cols?.[hIdx['name']] || '').trim();
          const eid = (cols?.[hIdx['entity_id']] || '').trim();
          errorNames.push(nm || eid || '(no name)');
          // Provide detailed console debugging for failing rows
          try {
            const rowObj: Record<string, string> = {};
            for (let i = 0; i < headers.length; i++) rowObj[headers[i]] = cols[i] ?? '';
            console.error('Import row error', { error: err, name: nm, entityId: eid, row: rowObj });
          } catch {}
        }
      }
      await b.commit();
    }

    setImportResult({ created, updated, skipped, errors, errorNames });
    setSummaryOpen(true);
    setImporting(false);
  }
  return (
    <div className="p-6 space-y-4">
      <BrandHeader title="Network" />
      <NetworkHeader
        types={types}
        onTypesChange={setTypes}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
      />
      <ActionBar
        onShare={() => setShareOpen(true)}
        shareDisabled={selected.size === 0}
        onExport={exportSelected}
        onImport={() => setConfirmOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        exportDisabled={selected.size === 0}
        importDisabled={importing}
        deleteDisabled={selected.size === 0}
      />
      <div className="flex items-center gap-3">
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>
      {selected.size > 0 && (
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full border px-2 py-1 text-sm text-foreground/80">
            {selected.size} selected
          </span>
        </div>
      )}
      {view === "table" ? (
        <EntitiesTable
          rows={rows}
          onEndReached={loadMore}
          loadingMore={loadingMore}
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
          onEndReached={loadMore}
          loadingMore={loadingMore}
          selectedIds={selected}
          onToggle={(id, checked) => setSelected((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; })}
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

      {/* Import confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import entities from CSV</DialogTitle>
            <DialogDescription>
              Existing entities will be updated by ID if you own them. New rows will be created.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); void importEntities(); }}>Choose CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay show={importing} label="Importing entities..." />

      {/* Import summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>
              {importResult ? `Created ${importResult.created}, Updated ${importResult.updated}, Skipped ${importResult.skipped}, Errors ${importResult.errors}` : 'No results'}
            </DialogDescription>
          </DialogHeader>
          {importResult?.errorNames && importResult.errorNames.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Errored rows:</div>
              <div className="max-h-[40vh] overflow-auto rounded border p-2 bg-muted/30">
                {importResult.errorNames.map((n, i) => (
                  <div key={i} className="text-sm text-foreground/80">{n}</div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSummaryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate name resolution modal */}
      <Dialog
        open={duplicatesOpen}
        onOpenChange={(v) => {
          if (!v) {
            // Clicking outside cancels the import
            setDuplicatesOpen(false);
            setDuplicateList([]);
            setDuplicateChoice({});
            setPendingImport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve duplicate names</DialogTitle>
            <DialogDescription>
              Some names already exist. Choose whether to override the existing entity or create a new one for each.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto -mx-2 px-2">
            {duplicateList.map((d) => {
              const choice = duplicateChoice[d.name] ?? 'override';
              return (
                <div key={d.name} className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
                  <div className="min-w-0 flex-1 truncate" title={d.name}>{d.name}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={choice === 'override' ? 'default' : 'secondary'}
                      onClick={() => setDuplicateChoice((prev) => ({ ...prev, [d.name]: 'override' }))}
                    >
                      Override
                    </Button>
                    <Button
                      variant={choice === 'create' ? 'default' : 'secondary'}
                      onClick={() => setDuplicateChoice((prev) => ({ ...prev, [d.name]: 'create' }))}
                    >
                      Create new
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => {
              // cancel import
              setDuplicatesOpen(false);
              setDuplicateList([]);
              setDuplicateChoice({});
              setPendingImport(null);
            }}>Cancel</Button>
            <Button onClick={async () => {
              if (!pendingImport) { setDuplicatesOpen(false); return; }
              setDuplicatesOpen(false);
              await continueImportWithChoices(pendingImport);
              // cleanup
              setDuplicateList([]);
              setDuplicateChoice({});
              setPendingImport(null);
            }}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import error dialog */}
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import error</DialogTitle>
            <DialogDescription>
              {errorMsg}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete selected confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת ישויות</DialogTitle>
            <DialogDescription>
              פעולה זו תמחוק לצמיתות את הישויות שנבחרו, תבטל שיתופים, תסיר קשרים, תעדכן מונים ותמחק Bits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>בטל</Button>
            <Button variant="destructive" onClick={async () => {
              setDeleteOpen(false);
              const res = await deleteEntities(selectedArray);
              setDeleteSummary(res);
              // Refresh selection
              setSelected(new Set());
            }}>מחק</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete summary */}
      <Dialog open={!!deleteSummary} onOpenChange={(v)=>{ if (!v) setDeleteSummary(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>המחיקה הושלמה</DialogTitle>
            <DialogDescription>
              {deleteSummary ? `נמחקו ${deleteSummary.deleted}, דילג על ${deleteSummary.skippedNotOwner}, שגיאות ${deleteSummary.errors}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteSummary(null)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


