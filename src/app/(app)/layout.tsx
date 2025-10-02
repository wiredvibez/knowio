"use client";
import { ReactNode, Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ToolbarTabs } from "@/components/nav/toolbar-tabs";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";

function TabsContainer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideTabs = pathname?.startsWith("/network") && Boolean(searchParams.get("entity"));
  if (hideTabs) return null;
  return <ToolbarTabs />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      {children}
      <Suspense fallback={null}>
        <TabsContainer />
      </Suspense>
    </RequireAuth>
  );
}


