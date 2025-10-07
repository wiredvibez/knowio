"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { MeSidebar } from "@/components/nav/me-sidebar";

export default function MeLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    function onCollapsed(e: Event) {
      const detail = (e as CustomEvent).detail as { isCollapsed?: boolean } | undefined;
      if (detail && typeof detail.isCollapsed === "boolean") {
        setIsCollapsed(detail.isCollapsed);
      }
    }
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("meSidebarCollapsed") : null;
      setIsCollapsed(saved === "1");
    } catch {}
    window.addEventListener("meSidebar:collapsed", onCollapsed as EventListener);
    return () => window.removeEventListener("meSidebar:collapsed", onCollapsed as EventListener);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Reserve space for the fixed right sidebar on desktop; shrink when collapsed */}
      <div className={`${isCollapsed ? "sm:mr-8" : "sm:mr-72"} mr-0 transition-[margin] duration-300 min-h-[60vh]`}>
        {children}
      </div>
      {/* Render the fixed sidebar at the edge */}
      <MeSidebar />
    </div>
  );
}


