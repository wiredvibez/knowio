"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export function useFriends() {
  const [uid, setUid] = useState<string | undefined>(auth.currentUser?.uid || undefined);
  const [friends, setFriends] = useState<string[]>([]);
  type FriendRequest = { id: string; from: string; to: string; created_at?: unknown };
  const [requestsIn, setRequestsIn] = useState<FriendRequest[]>([]);
  const [requestsOut, setRequestsOut] = useState<FriendRequest[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || undefined));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      setFriends((snap.data()?.friends as string[] | undefined) ?? []);
    });
    const rq = query(collection(db, "friend_requests"), where("to", "==", uid));
    const ro = query(collection(db, "friend_requests"), where("from", "==", uid));
    const unsubIn = onSnapshot(rq, (snap) => setRequestsIn(snap.docs.map((d) => ({ ...(d.data() as Omit<FriendRequest, 'id'>), id: d.id }))));
    const unsubOut = onSnapshot(ro, (snap) => setRequestsOut(snap.docs.map((d) => ({ ...(d.data() as Omit<FriendRequest, 'id'>), id: d.id }))));
    return () => { unsubUser(); unsubIn(); unsubOut(); };
  }, [uid]);

  async function sendRequestBy({ email, phone, uid: toUid }: { email?: string; phone?: string; uid?: string }) {
    if (!auth.currentUser) return;
    let recipient: string | undefined = toUid;
    if (!recipient && email) {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      recipient = snap.docs[0]?.id;
    }
    if (!recipient && phone) {
      const snap = await getDocs(query(collection(db, "users"), where("phone_e164", "==", phone)));
      recipient = snap.docs[0]?.id;
    }
    if (!recipient) return;
    await addDoc(collection(db, "friend_requests"), { from: auth.currentUser.uid, to: recipient, created_at: serverTimestamp() });
  }

  async function acceptRequest(id: string, from: string) {
    const me = auth.currentUser?.uid;
    if (!me) return;
    await updateDoc(doc(db, "users", me), { friends: setUnionField([from]) } as Record<string, unknown>);
    await updateDoc(doc(db, "users", from), { friends: setUnionField([me]) } as Record<string, unknown>);
    await deleteDoc(doc(db, "friend_requests", id));
  }

  async function removeFriend(other: string) {
    const me = auth.currentUser?.uid;
    if (!me) return;
    await updateDoc(doc(db, "users", me), { friends: arrayRemoveField([other]) } as Record<string, unknown>);
    await updateDoc(doc(db, "users", other), { friends: arrayRemoveField([me]) } as Record<string, unknown>);
  }

  // helpers to avoid importing FieldValue (TS type friction). Backend will interpret.
  function setUnionField(values: string[]) { return (window as unknown as { firebaseArrayUnion?: (...v: string[]) => unknown }).firebaseArrayUnion?.(...values) || values; }
  function arrayRemoveField(values: string[]) { return (window as unknown as { firebaseArrayRemove?: (...v: string[]) => unknown }).firebaseArrayRemove?.(...values) || []; }

  return { friends, requestsIn, requestsOut, sendRequestBy, acceptRequest, removeFriend };
}


