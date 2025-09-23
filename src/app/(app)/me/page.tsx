"use client";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserDoc } from "@/hooks/useUserDoc";
import { useState } from "react";

export default function MePage() {
  const { user, saveNickname } = useUserDoc();
  const [nick, setNick] = useState("");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">פרופיל</h1>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-semibold">כינוי</h2>
          <div className="flex gap-2">
            <Input
              value={nick ?? user?.nickname ?? ""}
              placeholder={user?.nickname ?? "הכניסו כינוי"}
              onChange={(e) => setNick(e.target.value)}
            />
            <Button onClick={() => nick && saveNickname(nick)}>שמור</Button>
          </div>
        </div>
        <div>
          <h2 className="font-semibold">Catch-up</h2>
          <p className="text-sm text-muted-foreground">קישור לוויזארד (בקרוב)</p>
        </div>
        <div>
          <h2 className="font-semibold">אירועי עבר</h2>
          <p className="text-sm text-muted-foreground">וויזארד לוח שנה (בקרוב)</p>
        </div>
        <div>
          <h2 className="font-semibold">התנתקות</h2>
          <Button variant="secondary" onClick={() => signOut(auth)}>התנתק</Button>
        </div>
      </div>
    </div>
  );
}


