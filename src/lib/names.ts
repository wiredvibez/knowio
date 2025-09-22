import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";

export async function fetchUserNames(uids: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(uids)).filter(Boolean);
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk as any)));
    snap.forEach((d) => { result[d.id] = (d.data() as any).display_name ?? d.id; });
  }
  return result;
}

export async function fetchEntityNames(ids: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const unique = Array.from(new Set(ids)).filter(Boolean);
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "entities"), where(documentId(), "in", chunk as any)));
    snap.forEach((d) => { result[d.id] = (d.data() as any).name ?? d.id; });
  }
  return result;
}


