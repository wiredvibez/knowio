"use client";
import { ReactNode, Suspense, useEffect } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ToolbarTabs } from "@/components/nav/toolbar-tabs";
import { usePathname, useSearchParams } from "next/navigation";

function TabsContainer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideTabs = pathname?.startsWith("/network") && Boolean(searchParams.get("entity"));
  if (hideTabs) return null;
  return <ToolbarTabs />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    // route change side-effects intentionally no-op in production
  }, [pathname]);

  useEffect(() => {
    try {
      // Long task observer to detect main-thread blocks
      if (typeof PerformanceObserver !== "undefined") {
        const po = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const e of entries) {
            const dur = Math.round((e as PerformanceEntry).duration || 0);
            if (dur >= 200) console.warn("[LongTask]", { dur, start: Math.round((e as PerformanceEntry).startTime || 0), name: (e as PerformanceEntry).name });
          }
        });
        try { po.observe({ entryTypes: ["longtask"] }); } catch {}
        return () => { try { po.disconnect(); } catch {} };
      }
    } catch {}
  }, []);

  return (
    <RequireAuth>
      {children}
      <Suspense fallback={null}>
        <TabsContainer />
      </Suspense>
    </RequireAuth>
  );
}


