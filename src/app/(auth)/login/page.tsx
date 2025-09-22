"use client";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const clickedRef = useRef(false);

  async function handleGoogle() {
    if (clickedRef.current || loading) return;
    clickedRef.current = true;
    setLoading(true);
    try {
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
    } catch (err: any) {
      // Ignore benign popup errors that are common during dev/hot reloads
      const code = err?.code as string | undefined;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // no-op
      } else {
        console.error(err);
        alert("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
      // allow retry after a brief tick to avoid multiple concurrent popups
      setTimeout(() => { clickedRef.current = false; }, 300);
    }
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
        <Button onClick={handleGoogle} className="w-full gap-2" size="lg" disabled={loading}>
          <span className="text-xl">G</span>
          {loading ? "מתחבר..." : "המשך עם Google"}
        </Button>
      </div>
    </div>
  );
}


