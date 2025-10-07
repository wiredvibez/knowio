"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getCountFromServer,
  limit,
  orderBy,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import type { EntityDoc, InteractionDoc } from "@/types/firestore";
import { useFriends } from "@/hooks/useFriends";
import { fetchEntityNames } from "@/lib/names";

// Placeholder wrappers for Animata components. Swap to real Animata once package/components are confirmed.
function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 w-full max-w-6xl mx-auto">
      {children}
    </div>
  );
}

function Card({ className, title, children }: { className?: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm min-h-36 ${className ?? ""}`}>
      <div className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-fuchsia-700/20 via-cyan-600/10 to-blue-700/20">
        {title}
      </div>
      <div className="p-4 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_50%),linear-gradient(to_bottom,rgba(56,189,248,0.05),transparent)]">
        {children}
      </div>
    </div>
  );
}

function OrbitingItemsFallback({ items }: { items: string[] }) {
  // Fallback to a simple cloud; replace with Animata Orbiting Items 3D
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className="px-2 py-1 rounded-full text-xs bg-fuchsia-600/15 text-fuchsia-700 border border-fuchsia-600/30">
          {t}
        </span>
      ))}
    </div>
  );
}

function MiniGauge({ label, value }: { label: string; value: number }) {
  // Fallback gauge using a progress bar; replace with Animata Gauge
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded">
        <div
          className={`h-2 rounded transition-all ${value < 40 ? "bg-rose-500" : value < 70 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [uid, setUid] = useState<string | null>(null);

  const { friends } = useFriends();
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [entityOwnedCount, setEntityOwnedCount] = useState<number | null>(null);
  const [entitySharedCount, setEntitySharedCount] = useState<number | null>(null);
  const [latestInteractions, setLatestInteractions] = useState<(InteractionDoc & { id: string })[]>([]);

  // For tag stats and completeness we sample owned entities (up to 400) and compute client-side
  const [sampledEntities, setSampledEntities] = useState<(EntityDoc & { id: string })[]>([]);

  // React to auth state so queries run when the user is available
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    (async () => {
      // Users collection: friends array length
      try {
        // We avoid an extra read; rely on auth state + user doc is already subscribed elsewhere for UI,
        // here we just fetch counts we need directly from related collections.
        const ownedAgg = await getCountFromServer(query(collection(db, "entities"), where("owner_id", "==", uid)));
        setEntityOwnedCount(ownedAgg.data().count);
      } catch {
        setEntityOwnedCount(null);
      }

      try {
        const sharedAgg = await getCountFromServer(query(collection(db, "entities"), where("viewer_ids", "array-contains", uid)));
        setEntitySharedCount(sharedAgg.data().count);
      } catch {
        setEntitySharedCount(null);
      }

      try {
        const qInteractor = query(collection(db, "interactions"), where("interactor_uid", "==", uid), orderBy("date", "desc"), limit(5));
        const qOwner = query(collection(db, "interactions"), where("owner_id", "==", uid), orderBy("date", "desc"), limit(5));
        let aDocs: typeof latestInteractions = [];
        let bDocs: typeof latestInteractions = [];
        try {
          const a = await getDocs(qInteractor);
          aDocs = a.docs.map((d) => ({ id: d.id, ...(d.data() as InteractionDoc) }));
        } catch {}
        try {
          const b = await getDocs(qOwner);
          bDocs = b.docs.map((d) => ({ id: d.id, ...(d.data() as InteractionDoc) }));
        } catch {}
        const mergedMap = new Map<string, InteractionDoc & { id: string }>();
        aDocs.forEach((d) => mergedMap.set(d.id, d));
        bDocs.forEach((d) => mergedMap.set(d.id, d));
        const merged = Array.from(mergedMap.values()).sort((x, y) => {
          const toMs = (v: unknown): number => {
            if (v && typeof v === 'object') {
              const obj = v as Record<string, unknown>;
              const toMillis = typeof (obj as { toMillis?: unknown }).toMillis === 'function'
                ? (obj as { toMillis: () => number }).toMillis
                : undefined;
              if (toMillis) {
                try { return toMillis.call(obj); } catch { /* noop */ }
              }
              const toDate = typeof (obj as { toDate?: unknown }).toDate === 'function'
                ? (obj as { toDate: () => Date }).toDate
                : undefined;
              if (toDate) {
                try { const d = toDate.call(obj); return d instanceof Date ? d.getTime() : 0; } catch { /* noop */ }
              }
            }
            const asStr = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
            const ms = asStr ? new Date(asStr).getTime() : 0;
            return Number.isFinite(ms) ? ms : 0;
          };
          return toMs(y.date) - toMs(x.date);
        }).slice(0, 2);
        setLatestInteractions(merged);
      } catch {
        setLatestInteractions([]);
      }

      try {
        const entSnap = await getDocs(query(collection(db, "entities"), where("owner_id", "==", uid), orderBy("created_at", "desc"), limit(400)));
        setSampledEntities(entSnap.docs.map((d) => ({ id: d.id, ...(d.data() as EntityDoc) })));
      } catch {
        setSampledEntities([]);
      }
    })();
  }, [uid]);

  // Resolve interactee names for latest interactions
  const [interacteeNames, setInteracteeNames] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(latestInteractions.flatMap((it) => it.entity_refs || []).filter(Boolean)));
      if (ids.length === 0) { setInteracteeNames({}); return; }
      try {
        const map = await fetchEntityNames(ids);
        setInteracteeNames(map);
      } catch {
        setInteracteeNames({});
      }
    })();
  }, [latestInteractions]);

  useEffect(() => {
    setFriendsCount(Array.isArray(friends) ? friends.length : null);
  }, [friends]);

  // Friends count derived from user doc is not locally available here; compute from entities? Not reliable.
  // As a fallback we display unknown as "—". If needed we can pass it via context.

  // Compute top tags and completeness from sampled entities
  const { topCharacterTags, topFieldTags, completeness } = useMemo(() => {
    const charCount = new Map<string, number>();
    const fieldCount = new Map<string, number>();

    let contactOk = 0;
    let tagsOk = 0; // at least one of each tag type: character AND field
    let photoOk = 0;

    const total = sampledEntities.length || 0;
    for (const e of sampledEntities) {
      for (const id of (e.character || [])) charCount.set(id, (charCount.get(id) || 0) + 1);
      for (const id of (e.field || [])) fieldCount.set(id, (fieldCount.get(id) || 0) + 1);

      const hasAnyContact = Boolean(
        (e.contact?.phone && e.contact?.phone.length > 0) ||
          (e.contact?.email && e.contact?.email.length > 0) ||
          (e.contact?.insta && e.contact?.insta.length > 0) ||
          (e.contact?.linkedin && e.contact?.linkedin.length > 0)
      );
      if (hasAnyContact) contactOk++;

      const hasCharacter = (e.character?.length || 0) > 0;
      const hasField = (e.field?.length || 0) > 0;
      if (hasCharacter && hasField) tagsOk++;

      if ((e.photo_url || "").trim() !== "") photoOk++;
    }

    const topChars = Array.from(charCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
    const topFields = Array.from(fieldCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);

    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

    return {
      topCharacterTags: topChars,
      topFieldTags: topFields,
      completeness: {
        contactPct: pct(contactOk),
        tagsBothPct: pct(tagsOk),
        photoPct: pct(photoOk),
      },
    };
  }, [sampledEntities]);

  return (
    <BentoGrid>
      {/* 1. Friends count (S -> M on xl) */}
      <Card title="חברים" className="xl:col-span-2">
        <div className="text-4xl font-extrabold tracking-tight text-cyan-600 drop-shadow">{friendsCount ?? "—"}</div>
        <div className="text-xs text-muted-foreground">סך הכל</div>
      </Card>

      {/* 2. Personal entity count (M) */}
      <div className="md:col-span-1 xl:col-span-2">
        <Card title="הנטוורק">
          <div className="flex items-end gap-6">
            <div>
              <div className="text-5xl font-black text-fuchsia-600">{entityOwnedCount ?? "—"}</div>
              <div className="text-xs text-muted-foreground">אנשים</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-fuchsia-700/70">{entitySharedCount ?? "—"}</div>
              <div className="text-xs text-muted-foreground">ששותפו איתך</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Catch-up block (M) - mock data, WIP */}
      <div className="md:col-span-1 xl:col-span-2">
        <Card title="התעדכנות (WIP)">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-extrabold text-rose-500">7</div>
              <div className="text-xs text-muted-foreground">באיחור</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-amber-500">12</div>
              <div className="text-xs text-muted-foreground">השבוע</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-emerald-500">9</div>
              <div className="text-xs text-muted-foreground">הושלמו בשבוע האחרון</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Top character tags (M) with orbiting items fallback */}
      <div className="md:col-span-1 xl:col-span-2">
        <Card title="תגי אופי מובילים">
          <OrbitingItemsFallback items={topCharacterTags} />
        </Card>
      </div>

      {/* 5. Top field tags (M) with orbiting items fallback */}
      <div className="md:col-span-1 xl:col-span-2">
        <Card title="תגי תחום מובילים">
          <OrbitingItemsFallback items={topFieldTags} />
        </Card>
      </div>

      {/* 6. Latest interactions (S -> M on xl) - no links */}
      <Card title="אינטראקציות אחרונות" className="xl:col-span-2">
        <div className="max-w-[280px]">
          <ul className="">
            {latestInteractions.map((it) => (
              <li key={it.id} className="text-sm p-1">
                {(() => {
                  const id = it.entity_refs?.[0];
                  const name = id ? (interacteeNames[id] ?? id) : "ישות";
                  const type = (it.type || "סוג").toString();
                  const toMs = (v: unknown): number => {
                    if (v && typeof v === 'object') {
                      const obj = v as Record<string, unknown>;
                      const toMillis = typeof (obj as { toMillis?: unknown }).toMillis === 'function'
                        ? (obj as { toMillis: () => number }).toMillis
                        : undefined;
                      if (toMillis) {
                        try { return toMillis.call(obj); } catch { /* noop */ }
                      }
                      const toDate = typeof (obj as { toDate?: unknown }).toDate === 'function'
                        ? (obj as { toDate: () => Date }).toDate
                        : undefined;
                      if (toDate) {
                        try { const d = toDate.call(obj); return d instanceof Date ? d.getTime() : 0; } catch { /* noop */ }
                      }
                    }
                    const asStr = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
                    const ms = asStr ? new Date(asStr).getTime() : 0;
                    return Number.isFinite(ms) ? ms : 0;
                  };
                  const ms = toMs(it.date as unknown);
                  const dateStr = ms ? new Date(ms).toLocaleDateString() : "";
                  return (
                    <span className="block whitespace-nowrap">
                      <span className="font-medium">{type}</span>
                      <span> בחברת </span>
                      <span className="font-medium inline-block">{name}</span>
                      <span> | </span>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </span>
                  );
                })()}
              </li>
            ))}
            {latestInteractions.length === 0 && (
              <li className="text-xs text-muted-foreground">אין נתונים להצגה</li>
            )}
          </ul>
        </div>
      </Card>

      {/* 7. Completeness gauges (L) */}
      <div className="md:col-span-2 xl:col-span-2 2xl:col-span-2">
        <Card title="מדדי השלמה">
          <div className="grid md:grid-cols-3 gap-4">
            <MiniGauge label="עם פרטי קשר" value={completeness.contactPct} />
            <MiniGauge label="עם תגי אופי+תחום" value={completeness.tagsBothPct} />
            <MiniGauge label="עם תמונת פרופיל" value={completeness.photoPct} />
          </div>
        </Card>
      </div>

      {/* 8. Placeholders (S x4) */}
      {[1, 2, 3, 4].map((n) => (
        <Card key={n} title={`בקרוב`}>
          <div className="h-16 bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse rounded" />
          <div className="mt-2 text-xs text-muted-foreground">עוד בלוקים מגניבים בדרך…</div>
        </Card>
      ))}
    </BentoGrid>
  );
}

export default Dashboard;


