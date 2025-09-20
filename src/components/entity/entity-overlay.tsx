"use client";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";

export function EntityOverlay({ open, onOpenChange, entityId }: { open: boolean; onOpenChange: (v: boolean) => void; entityId?: string }) {
  if (!open || !entityId) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-4 md:inset-auto md:bottom-4 md:top-4 md:right-4 md:left-4 bg-background rounded-xl shadow-xl p-4 overflow-auto">
        <div className="text-sm text-muted-foreground">כרטיס ישות (בקרוב)</div>
      </div>
    </Dialog>
  );
}


