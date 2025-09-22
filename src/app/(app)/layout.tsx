"use client";
import { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ToolbarTabs } from "@/components/nav/toolbar-tabs";
import { usePathname, useSearchParams } from "next/navigation";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideTabs = pathname?.startsWith("/network") && Boolean(searchParams.get("entity"));
  return (
    <RequireAuth>
      {children}
      {!hideTabs && <ToolbarTabs />}
    </RequireAuth>
  );
}


