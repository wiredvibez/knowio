import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";

export async function fetchUserNames(uids: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(uids)).filter(Boolean);
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk as string[])));
    snap.forEach((d) => {
      const data = d.data() as { display_name?: unknown };
      const name = typeof data.display_name === 'string' ? data.display_name : d.id;
      result[d.id] = name;
    });
  }
  return result;
}

export async function fetchEntityNames(ids: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(ids)).filter(Boolean);
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "entities"), where(documentId(), "in", chunk as string[])));
    snap.forEach((d) => {
      const data = d.data() as { name?: unknown };
      const name = typeof data.name === 'string' ? data.name : d.id;
      result[d.id] = name;
    });
  }
  return result;
}


