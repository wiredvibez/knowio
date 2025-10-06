"use client";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useUserDoc } from "@/hooks/useUserDoc";
import Link from "next/link";
import { BrandHeader } from "@/components/nav/brand-header";

export default function MePage() {
  const { user } = useUserDoc();

  return (
    <div className="p-6 space-y-6">
      <BrandHeader title="Me" avatarUrl={user?.photo_url} />
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


