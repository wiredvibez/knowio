import { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ToolbarTabs } from "@/components/nav/toolbar-tabs";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      {children}
      <ToolbarTabs />
    </RequireAuth>
  );
}


