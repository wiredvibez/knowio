"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import type { UserDoc } from "@/types/firestore";

export function useUserDoc() {
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }
      const ref = doc(db, "users", u.uid);
      const unsub = onSnapshot(ref, (snap) => {
        setUser((snap.data() as UserDoc) ?? null);
        setLoading(false);
      });
      return () => unsub();
    });
    return () => unsubAuth();
  }, []);

  async function saveNickname(nickname: string) {
    const u = auth.currentUser;
    if (!u) return;
    await updateDoc(doc(db, "users", u.uid), { nickname });
  }

  return { user, loading, saveNickname };
}


