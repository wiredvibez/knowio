"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import type { UserDoc } from "@/types/firestore";

export function useUserDoc() {
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((u) => {
      // Clean up previous user doc subscription when auth state changes
      if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = undefined; }

      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, "users", u.uid);
      unsubUserDoc = onSnapshot(ref, (snap) => {
        setUser((snap.data() as UserDoc) ?? null);
        setLoading(false);
      });
    });

    return () => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = undefined;
      }
      unsubAuth();
    };
  }, []);

  async function saveNickname(nickname: string) {
    const u = auth.currentUser;
    if (!u) return;
    await updateDoc(doc(db, "users", u.uid), { nickname });
  }

  return { user, loading, saveNickname };
}


