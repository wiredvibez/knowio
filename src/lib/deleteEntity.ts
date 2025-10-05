import { auth, db } from "@/lib/firebase";
import { arrayRemove, collection, doc, getDoc, getDocs, increment, query, where, writeBatch } from "firebase/firestore";

type DeleteResult = { deleted: number; skippedNotOwner: number; errors: number };

export async function deleteEntities(entityIds: string[]): Promise<DeleteResult> {
  const uid = auth.currentUser?.uid;
  if (!uid || entityIds.length === 0) return { deleted: 0, skippedNotOwner: 0, errors: 0 };

  let deleted = 0, skippedNotOwner = 0, errors = 0;

  // Process per-entity to keep batch sizes safe
  for (const id of entityIds) {
    try {
      const ref = doc(db, "entities", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) { continue; }
      const data = snap.data() as { owner_id?: string; from?: string[]; relationship?: string[]; character?: string[]; field?: string[] };
      if (data.owner_id !== uid) { skippedNotOwner++; continue; }

      const b = writeBatch(db);

      // 1) Decrement tag usage counts
      for (const cat of ["from","relationship","character","field"] as const) {
        const ids: string[] = Array.isArray(data?.[cat]) ? data[cat] : [];
        for (const tid of ids) {
          // Use merge set to avoid batch failure if tag doc is missing
          b.set(doc(collection(db, `picker_${cat}`), tid), { usage_count: increment(-1) } as Record<string, unknown>, { merge: true });
        }
      }

      // 2) Remove entity from relations arrays of other entities (only within our own entities to satisfy security rules)
      const relQ = query(
        collection(db, "entities"),
        where("owner_id", "==", uid),
        where("relations", "array-contains", id)
      );
      const relSnap = await getDocs(relQ);
      relSnap.forEach((d) => {
        const ownerId = (d.data() as { owner_id?: string })?.owner_id;
        if (ownerId === uid) {
          b.update(d.ref, { relations: arrayRemove(id) });
        }
      });

      // 3) Remove from shares entity_ids; delete share doc if becomes empty (only shares we sent)
      const sharesQ = query(collection(db, "shares"), where("sender_id", "==", uid), where("entity_ids", "array-contains", id));
      const sharesSnap = await getDocs(sharesQ);
      for (const d of sharesSnap.docs) {
        const entityIds = (d.data()?.entity_ids as string[]) || [];
        if (entityIds.length <= 1) {
          b.delete(d.ref);
        } else {
          b.update(d.ref, { entity_ids: arrayRemove(id) });
        }
      }

      // 4) Remove from interactions (owner's only). Delete interaction if only this entity was referenced
      const interQ = query(collection(db, "interactions"), where("owner_id", "==", uid), where("entity_refs", "array-contains", id));
      const interSnap = await getDocs(interQ);
      for (const d of interSnap.docs) {
        const refs: string[] = (d.data()?.entity_refs as string[]) || [];
        if (refs.length <= 1) b.delete(d.ref); else b.update(d.ref, { entity_refs: arrayRemove(id) });
      }

      // 5) Delete bits subcollection (only bits authored by current user per rules)
      const bitsSnap = await getDocs(collection(db, "entities", id, "bits"));
      for (const bit of bitsSnap.docs) {
        const authorId = (bit.data() as { author_id?: string })?.author_id;
        if (authorId === uid) b.delete(bit.ref);
      }

      // 6) Finally, delete the entity
      b.delete(ref);

      await b.commit();
      deleted++;
    } catch (e) {
      console.warn("delete entity error", id, e);
      errors++;
    }
  }

  return { deleted, skippedNotOwner, errors };
}


