"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Network as NetworkIcon, Users2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserDoc } from "@/hooks/useUserDoc";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { href: "/network", label: "הרשת", icon: NetworkIcon },
  { href: "/community", label: "קהילה", icon: Users2 },
];

export function ToolbarTabs() {
  const pathname = usePathname();
  

  useEffect(() => {
    // Event loop lag probe
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const drift = now - last - 1000;
      if (drift > 250) {
        console.warn("[Perf] EventLoopLag>250ms", { drift: Math.round(drift), now });
      }
      last = now;
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 rounded-full bg-foreground/90 text-background backdrop-blur px-3 py-2 shadow-lg">
        {/* Profile Tab as avatar */}
        {(() => {
          const active = pathname === "/me" || pathname?.startsWith("/me/");
          return (
            <Link
              key="me"
              href="/me"
              className={cn(
                "flex items-center rounded-full px-2 py-1",
                active ? "bg-background text-foreground" : "hover:bg-background/10"
              )}
            >
              <ProfileAvatar />
            </Link>
          );
        })()}
        {TABS.map((t) => {
          const active = pathname === t.href || pathname?.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
                active ? "bg-background text-foreground" : "hover:bg-background/10"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-foreground")} />
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ProfileAvatar() {
  const { user } = useUserDoc();
  const url = user?.photo_url;
  return (
    <Avatar className="h-7 w-7 border border-background/20">
      <AvatarImage
        src={url && url.trim() !== "" ? url : undefined}
        alt="me"
        referrerPolicy="no-referrer"
      />
      <AvatarFallback>אני</AvatarFallback>
    </Avatar>
  );
}


