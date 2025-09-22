import { Share2, Download, Printer, Group, Settings2 } from "lucide-react";

export function ActionBar({ onShare, disabled }: { onShare: () => void; disabled?: boolean }) {
  return (
    <div className="mt-4">
      <div className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-3 py-2">
        <button onClick={onShare} disabled={disabled} className="p-2 rounded-full bg-background text-foreground disabled:opacity-50">
          <Share2 className="h-4 w-4" />
        </button>
        <button disabled className="p-2 rounded-full opacity-50">
          <Download className="h-4 w-4" />
        </button>
        <button disabled className="p-2 rounded-full opacity-50">
          <Printer className="h-4 w-4" />
        </button>
        <button disabled className="p-2 rounded-full opacity-50">
          <Group className="h-4 w-4" />
        </button>
        <button disabled className="p-2 rounded-full opacity-50">
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


