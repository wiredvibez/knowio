"use client";

import { useRef, useState } from "react";
import { Share2, Download, Upload, Trash2, Printer, Group, Settings2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type ActionIconButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  tooltip: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
};

function ActionIconButton({ onClick, disabled, tooltip, ariaLabel, className, children }: ActionIconButtonProps) {
  const [open, setOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleTouchStart() {
    didLongPressRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      setOpen(true);
      window.setTimeout(() => setOpen(false), 1500);
    }, 400);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (didLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearLongPressTimer();
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          disabled={disabled}
          aria-label={ariaLabel}
          className={className}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function ActionBar({ onShare, onExport, onImport, onDelete, shareDisabled, exportDisabled, importDisabled, deleteDisabled }: { onShare: () => void; onExport: () => void; onImport: () => void; onDelete: () => void; shareDisabled?: boolean; exportDisabled?: boolean; importDisabled?: boolean; deleteDisabled?: boolean; }) {
  return (
    <div className="mt-4 flex items-center gap-2 justify-center sm:justify-start">
      <div className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-3 py-2">
        <ActionIconButton
          onClick={onShare}
          disabled={shareDisabled}
          tooltip="Share"
          ariaLabel="Share"
          className="p-2 rounded-full bg-background text-foreground disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          onClick={onImport}
          disabled={importDisabled}
          tooltip="Import"
          ariaLabel="Import"
          className="p-2 rounded-full bg-background text-foreground disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          onClick={onExport}
          disabled={exportDisabled}
          tooltip="Export"
          ariaLabel="Export"
          className="p-2 rounded-full bg-background text-foreground disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          onClick={onDelete}
          disabled={deleteDisabled}
          tooltip="Delete"
          ariaLabel="Delete"
          className="p-2 rounded-full bg-background text-foreground disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          disabled
          tooltip="Print (coming soon)"
          ariaLabel="Print"
          className="p-2 rounded-full opacity-50"
        >
          <Printer className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          disabled
          tooltip="Group (coming soon)"
          ariaLabel="Group"
          className="p-2 rounded-full opacity-50"
        >
          <Group className="h-4 w-4" />
        </ActionIconButton>
        <ActionIconButton
          disabled
          tooltip="Settings (coming soon)"
          ariaLabel="Settings"
          className="p-2 rounded-full opacity-50"
        >
          <Settings2 className="h-4 w-4" />
        </ActionIconButton>
      </div>
    </div>
  );
}


