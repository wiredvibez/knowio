"use client";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  async function handleGoogle() {
    const res = await signInWithPopup(auth, googleProvider);
    const u = res.user;
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        display_name: u.displayName ?? "",
        photo_url: u.photoURL ?? "",
        email: u.email ?? "",
        phone_e164: u.phoneNumber ?? "",
        friends: [],
        preferences: {},
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(ref, { updated_at: serverTimestamp() }, { merge: true });
    }
    router.replace("/network");
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) router.replace("/network");
    });
    return () => unsub();
  }, [router]);

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-2xl font-semibold">כניסה</h1>
        <Button onClick={handleGoogle} className="w-full gap-2" size="lg">
          <span className="text-xl">G</span>
          המשך עם Google
        </Button>
      </div>
    </div>
  );
}


