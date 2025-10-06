"use client";
import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { fns } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OnboardingCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const code = params.get("code");
    const verifier = sessionStorage.getItem("oauth_code_verifier") || "";
    const redirectUri = `${window.location.origin}/onboarding/callback`;
    if (!code || !verifier) {
      setStatus("error");
      setMessage("נראה שהאישור בוטל או פג.");
      return;
    }
    (async () => {
      try {
        const call = httpsCallable(fns, "googleCalendarExchange");
        await call({ code, redirectUri, codeVerifier: verifier });
        setStatus("ok");
        setMessage("החיבור בוצע בהצלחה 🎉");
        // Clean up
        sessionStorage.removeItem("oauth_code_verifier");
        // Return to onboarding step 2
        setTimeout(() => router.replace("/onboarding"), 1000);
      } catch (e: unknown) {
        console.error(e);
        setStatus("error");
        setMessage("שגיאה בחיבור לגוגל");
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="text-center space-y-4">
        <div className="text-2xl font-semibold">התחברות ללוח שנה</div>
        <div className="text-muted-foreground">{message || "ממתינים לאישור..."}</div>
        <Button variant="secondary" onClick={() => router.replace("/onboarding")}>חזרה לאונבורדינג</Button>
      </div>
    </div>
  );
}


