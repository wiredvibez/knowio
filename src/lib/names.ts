import { db } from "@/lib/firebase";
import { collection, documentId, getDoc, getDocs, query, where, doc } from "firebase/firestore";

// Simple in-memory caches to avoid repeated reads and reduce UI stalls
const USER_NAME_CACHE: Record<string, string> = {};
const ENTITY_NAME_CACHE: Record<string, string> = {};

export async function fetchUserNames(uids: string[]): Promise<Record<string, string>> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(uids)).filter(Boolean);
  if (unique.length === 0) return result;
  const missing: string[] = [];
  for (const id of unique) {
    const cached = USER_NAME_CACHE[id];
    if (cached) result[id] = cached; else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 10) {
    const chunk = missing.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk as string[])));
    snap.forEach((d) => {
      const data = d.data() as { display_name?: unknown };
      const name = typeof data.display_name === 'string' ? data.display_name : d.id;
      result[d.id] = name;
      USER_NAME_CACHE[d.id] = name;
    });
  }
  
  return result;
}

export async function fetchEntityNames(ids: string[]): Promise<Record<string, string>> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return result;
  const missing: string[] = [];
  for (const id of unique) {
    const cached = ENTITY_NAME_CACHE[id];
    if (cached) result[id] = cached; else missing.push(id);
  }
  // Batched per-doc reads to cap concurrency and avoid UI stalls
  const batchSize = 20;
  for (let i = 0; i < missing.length; i += batchSize) {
    const chunk = missing.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const d = await getDoc(doc(db, "entities", id));
          if (d.exists()) {
            const data = d.data() as { name?: unknown };
            const name = typeof data.name === 'string' ? data.name : d.id;
            result[d.id] = name;
            ENTITY_NAME_CACHE[d.id] = name;
          }
        } catch {
          // ignore permission errors for entities not visible to the current user
        }
      })
    );
  }
  
  return result;
}


