"use client";
import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { useUserDoc } from "@/hooks/useUserDoc";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const { user } = useUserDoc();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    // Redirect to onboarding if not completed and not already on onboarding
    if (!ready) return;
    if (!user) return;
    const incomplete = !(user.onboarding?.completed ?? false);
    if (incomplete && !(pathname && pathname.startsWith("/onboarding"))) {
      router.replace("/onboarding");
    }
  }, [ready, user, pathname, router]);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Image src="/p-logo-nobg.png" alt="Peepz" width={120} height={120} priority className="animate-pulse" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}


