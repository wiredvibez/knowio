"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db, storage, fns } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useUserDoc } from "@/hooks/useUserDoc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfilePhotoUpload } from "@/components/auth/profile-photo-upload";
import { httpsCallable } from "firebase/functions";

function IntentChip({ label, value, selected, onToggle }: { label: string; value: string; selected: boolean; onToggle: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`px-4 py-2 rounded-full border text-sm transition-colors ${selected ? "bg-purple-600 text-white border-purple-600" : "bg-white border-gray-300"}`}
    >
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUserDoc();
  const forcedWelcomeRef = useRef(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<"social" | "friends" | "search" | "other" | "unknown">("unknown");
  const [sourceOther, setSourceOther] = useState("");
  const [intents, setIntents] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [step, setStep] = useState<"welcome" | "integrations">("welcome");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<"connected" | "disconnected" | "error" | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setPhone(user.phone_e164 ?? "");
    // Force start at welcome only on first load, not after subsequent user doc updates
    if (!forcedWelcomeRef.current) {
      setStep("welcome");
      forcedWelcomeRef.current = true;
    }
    const curSource = user.discovery?.source ?? "unknown";
    setSource(curSource as any);
    setSourceOther(user.discovery?.otherText ?? "");
    setIntents(user.intents ?? []);
    setCalendarStatus(user.integrations?.calendar?.status as any);
  }, [user]);

  const headerName = useMemo(() => displayName || (user?.email?.split("@")[0] ?? ""), [displayName, user?.email]);

  async function savePartial(updates: Record<string, unknown>) {
    const u = auth.currentUser;
    if (!u) return;
    await updateDoc(doc(db, "users", u.uid), { ...updates, updated_at: serverTimestamp() });
  }

  function normalizePhone(input: string): { e164?: string; error?: string } {
    const value = (input || "").trim();
    if (!value) return { e164: "" };
    // Accept Israeli local 050/051/052 etc (10 digits, starting with 0)
    if (/^0\d{9}$/.test(value)) {
      const local = value.replace(/^0/, "");
      return { e164: `+972${local}` };
    }
    // Accept international E.164
    if (/^\+\d{8,15}$/.test(value)) {
      return { e164: value };
    }
    return { error: "מספר לא חוקי. השתמשו בפורמט 050... או +..." };
  }

  async function handleContinueWelcome() {
    const { e164, error } = normalizePhone(phone);
    if (error) { setPhoneError(error); return; }
    setPhoneError(null);
    await savePartial({
      display_name: displayName,
      phone_e164: e164 ?? "",
      discovery: { source, otherText: source === "other" ? sourceOther : "" },
      intents,
      onboarding: { completed: false, step: "integrations" },
    });
    setStep("integrations");
  }

  async function uploadPhoto() {
    if (!photoFile || !auth.currentUser) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const path = `users/${auth.currentUser.uid}/profile/photo.jpg`;
      const r = ref(storage, path);
      await uploadBytes(r, photoFile, { contentType: photoFile.type || "image/jpeg" });
      const url = await getDownloadURL(r);
      setPhotoUrl(url);
      await savePartial({ photo_url: url });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function completeOnboarding() {
    await savePartial({ onboarding: { completed: true, step: "integrations" } });
    router.replace("/network");
  }

  // Load GIS script and use code client popup
  useEffect(() => {
    const id = "gis-client";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  async function connectGoogleCalendar() {
    setOauthBusy(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID as string | undefined;
      if (!clientId) {
        alert("חסר מזהה לקוח של Google (NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID)");
        return;
      }
      const g = (window as any).google;
      if (!g?.accounts?.oauth2?.initCodeClient) {
        alert("טוען את Google... נסו שוב בעוד רגע");
        return;
      }
      const codeClient = g.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
        ux_mode: "popup",
        callback: async (resp: { code?: string; error?: string }) => {
          if (!resp || !resp.code) return;
          try {
            const call = httpsCallable(fns, "googleCalendarExchange");
            await call({ code: resp.code, redirectUri: "postmessage" });
            setCalendarStatus("connected");
          } catch (e) {
            console.error(e);
            setCalendarStatus("error");
          }
        },
      });
      codeClient.requestCode();
    } finally {
      setOauthBusy(false);
    }
  }

  async function disconnectGoogleCalendar() {
    setOauthBusy(true);
    try {
      const call = httpsCallable(fns, "googleCalendarDisconnect");
      await call({});
      setCalendarStatus("disconnected");
    } catch (e) {
      console.error(e);
      setCalendarStatus("error");
    } finally {
      setOauthBusy(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-2xl space-y-10">
        {step === "welcome" ? (
          <div className="space-y-8 rounded-3xl p-6 md:p-10 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 border">
            <div className="text-center space-y-3">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontVariationSettings: '"wght" 800' }}>
                👋 ברוך הבא, {headerName}
              </div>
              <div className="text-muted-foreground">בואו נתאים את החוויה בשבילכם ✨</div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="font-medium">שם תצוגה</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="הכנס/י שם" />
              </div>

              <div className="space-y-2">
                <label className="font-medium">תמונת פרופיל</label>
                <ProfilePhotoUpload
                  initialUrl={user?.photo_url}
                  onUploaded={async (url) => {
                    setPhotoUrl(url);
                    await savePartial({ photo_url: url });
                  }}
                  size={80}
                />
              </div>

              <div className="space-y-2">
                <label className="font-medium">טלפון</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050... או +972..." />
                {phoneError && <div className="text-sm text-red-600">{phoneError}</div>}
              </div>

              <div className="space-y-2">
                <label className="font-medium">איך שמעתם עלינו?</label>
                <div className="flex flex-wrap gap-2">
                  {["social","friends","search","other","unknown"].map((v) => (
                    <button key={v} type="button" onClick={() => setSource(v as any)} className={`px-3 py-1.5 rounded-full border ${source===v?"bg-blue-600 text-white border-blue-600":"bg-white"}`}>
                      {v === "social" ? "🌐 רשתות" : v === "friends" ? "👥 חברים" : v === "search" ? "🔎 חיפוש" : v === "other" ? "✨ אחר" : "🤷 לא זוכר"}
                    </button>
                  ))}
                </div>
                {source === "other" && (
                  <Input value={sourceOther} onChange={(e) => setSourceOther(e.target.value)} placeholder="פרטו בבקשה" />
                )}
              </div>

              <div className="space-y-2">
                <label className="font-medium">למה אתם כאן?</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "relationships", l: "💞 לחזק קשרים" },
                    { v: "business", l: "💼 נטוורקינג עסקי" },
                    { v: "fun", l: "🎉 בשביל הכיף" },
                    { v: "other", l: "✨ אחר" },
                  ].map(({ v, l }) => (
                    <IntentChip
                      key={v}
                      value={v}
                      label={l}
                      selected={intents.includes(v)}
                      onToggle={(val) => setIntents((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">אפשר לשנות הכל אחר כך 😊</div>
              <Button size="lg" onClick={handleContinueWelcome} className="bg-blue-600 hover:bg-blue-700">להמשיך ▶️</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 rounded-3xl p-6 md:p-10 bg-gradient-to-br from-blue-100 via-green-100 to-yellow-100 border">
            <div className="text-center space-y-3">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight">🔌 אינטגרציות</div>
              <div className="text-muted-foreground">אפשר להתחבר לגוגל לוח שנה (קרוב) או לדלג לעת עתה</div>
            </div>

            <div className="grid gap-3">
              {calendarStatus === "connected" ? (
                <div className="flex items-center justify-between rounded-lg border bg-white p-3">
                  <div>מחובר ל-Google Calendar ✅</div>
                  <Button variant="destructive" onClick={disconnectGoogleCalendar} disabled={oauthBusy}>נתק</Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" disabled={oauthBusy} onClick={connectGoogleCalendar}>חיבור ל-Google Calendar</Button>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep("welcome")}>⬅️ חזרה</Button>
              <Button size="lg" onClick={completeOnboarding} className="bg-green-600 hover:bg-green-700">סיום 🎉</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


