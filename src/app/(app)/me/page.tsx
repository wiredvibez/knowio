"use client";
import { useUserDoc } from "@/hooks/useUserDoc";
import { BrandHeader } from "@/components/nav/brand-header";
import { Dashboard } from "@/components/me/dashboard";

export default function MePage() {
  const { user } = useUserDoc();

  return (
    <div className="space-y-6">
      <BrandHeader title="Dashboard" />
      <Dashboard />
    </div>
  );
}


