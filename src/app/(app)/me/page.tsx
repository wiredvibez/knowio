"use client";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useUserDoc } from "@/hooks/useUserDoc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function MePage() {
  const { user } = useUserDoc();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user?.photo_url} alt="avatar" />
          <AvatarFallback>🙂</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold">הפרופיל של {user?.display_name || user?.email?.split("@")[0]}</h1>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <h2 className="font-semibold">עדכון פרטי אונבורדינג</h2>
            <p className="text-sm text-muted-foreground">שנו שם, טלפון, מטרות וכו׳</p>
          </div>
          <Link href="/onboarding">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">פתחו אונבורדינג</Button>
          </Link>
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
          <Button variant="secondary" onClick={() => signOut(auth)}>התנתק</Button>
        </div>
      </div>
    </div>
  );
}


