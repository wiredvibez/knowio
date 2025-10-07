"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUserDoc } from "@/hooks/useUserDoc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  disabled?: boolean;
};

const sections: Array<{ header: string; items: NavItem[] }> = [
  {
    header: "כללי",
    items: [
      { label: "לוח בקרה", href: "/me" },
      { label: "עדכון פרטים אישיים", href: "/onboarding" },
    ],
  },
  {
    header: "חברתי",
    items: [
      { label: "חברים", href: "/me/social/friends" },
      { label: "בקרת שיתוף", href: "/me/social/sharing" },
      { label: "התעדכנות (בקרוב)", disabled: true },
      { label: "לוח אירועים (בקרוב)", disabled: true },
    ],
  },
  {
    header: "אינטגרציות",
    items: [
      { label: "יומן (בקרוב)", disabled: true },
      { label: "אנשי קשר (בקרוב)", disabled: true },
      { label: "רשתות חברתיות (בקרוב)", disabled: true },
      { label: "בוט וואטסאפ AI (בקרוב)", disabled: true },
    ],
  },
  {
    header: "יצירתיות",
    items: [
      { label: "הרעיונות שלי (בקרוב)", disabled: true },
      { label: "הגדרות", href: "/me/settings" },
    ],
  },
];

export function MeSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEntered, setMobileEntered] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sections.map((s) => [s.header, true])) as Record<string, boolean>
  );
  const { user } = useUserDoc();
  // Hydrate collapsed from localStorage and announce on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meSidebarCollapsed");
      if (saved === "1") {
        setIsCollapsed(true);
      }
      window.dispatchEvent(new CustomEvent("meSidebar:collapsed", { detail: { isCollapsed: saved === "1" } }));
    } catch {}
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("meSidebarCollapsed", next ? "1" : "0"); } catch {}
      try { window.dispatchEvent(new CustomEvent("meSidebar:collapsed", { detail: { isCollapsed: next } })); } catch {}
      return next;
    });
  }

  function toggleSection(header: string) {
    setOpenSections((prev) => ({ ...prev, [header]: !prev[header] }));
  }

  // Close mobile on outside click, and animate from the bubble
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!mobileOpen) return;
      const target = e.target as Node;
      if (overlayRef.current && overlayRef.current.contains(target)) return;
      setMobileEntered(false);
    }
    if (mobileOpen) {
      document.addEventListener("click", handleClickOutside);
      document.body.style.overflow = "hidden";
      // trigger enter animation next frame
      requestAnimationFrame(() => setMobileEntered(true));
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileEntered(false);
  }

  const SidebarContent = (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b bg-muted/70 rounded-t-md flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user?.photo_url || ""} alt="profile" referrerPolicy="no-referrer" />
          <AvatarFallback>Me</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-bold text-base truncate">{user?.nickname || user?.display_name || "Me"}</div>
        </div>
      </div>
      <nav className="p-3 space-y-3 overflow-y-auto">
        {sections.map((sec) => {
          const isOpen = openSections[sec.header];
          return (
            <div key={sec.header} className="rounded-md bg-background/60 border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleSection(sec.header)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/60 rounded-t-md"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex w-4 h-4 items-center justify-center" aria-hidden>
                    {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                  </span>
                  {sec.header}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen ? "max-h-96" : "max-h-0"}`}
              >
                <ul className="px-1 py-2">
                  {sec.items.map((item) => {
                    const active = item.href && pathname?.startsWith(item.href);
                    const baseItem = "block rounded text-sm ml-4 pl-4 pr-3 py-1.5 transition-colors";
                    if (item.disabled || !item.href) {
                      return (
                        <li key={item.label}>
                          <span className={`${baseItem} text-muted-foreground/60 cursor-not-allowed select-none`}>{item.label}</span>
                        </li>
                      );
                    }
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => { if (mobileOpen) closeMobile(); }}
                          className={`${baseItem} ${active ? "bg-foreground text-background" : "hover:bg-muted/60 hover:ring-1 hover:ring-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground active:ring-2 active:ring-foreground"}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile floating bubble */}
      <button
        aria-label="Open sidebar"
        className="sm:hidden fixed top-4 right-4 z-40 rounded-full bg-foreground text-background shadow p-3"
        onClick={() => setMobileOpen(true)}
      >
        {/* simple hamburger */}
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current" />
      </button>

      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-start justify-start bg-black/30">
          <div
            ref={overlayRef}
            onTransitionEnd={() => { if (!mobileEntered) setMobileOpen(false); }}
            className={`mt-16 mr-4 w-[85%] max-w-[340px] h-[72vh] rounded-xl bg-muted border shadow-xl overflow-hidden relative origin-top-right transform transition-all duration-300 ease-out ${mobileEntered ? "opacity-100 scale-100 translate-x-0 translate-y-0" : "opacity-0 scale-0 translate-x-8 -translate-y-8"}`}
          >
            <button
              aria-label="Close sidebar"
              className="absolute top-2 right-2 text-sm px-2 py-1 rounded border"
              onClick={closeMobile}
            >
              x
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar on the right with collapse control */}
      <aside
        className={`hidden sm:block fixed inset-y-0 right-0 transition-[width] duration-300 ${isCollapsed ? "w-8" : "w-72"} z-30`}
      >
        {/* collapse/expand handle as a vertical column */}
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={!isCollapsed}
          className="absolute left-0 top-0 z-10 h-full w-8 bg-background border-l shadow-sm hover:bg-muted/60 transition-colors flex items-center justify-center"
          onClick={toggleCollapsed}
        >
          <span className="text-base">{isCollapsed ? ">" : "<"}</span>
        </button>

        <div className={`h-full bg-muted border-l rounded-l-md ml-8 shadow-sm overflow-hidden`}>          
          <div className={`h-full transition-opacity duration-200 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            {SidebarContent}
          </div>
        </div>
      </aside>
    </>
  );
}

export default MeSidebar;


