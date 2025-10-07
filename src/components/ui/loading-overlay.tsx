"use client";
import Image from "next/image";
import { useEffect } from "react";

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
  // When true (default), the overlay intercepts pointer events; when false, it is visual-only
  blocking?: boolean;
};

export function LoadingOverlay({ show, label, blocking = true }: LoadingOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm grid place-items-center ${blocking ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/p-logo-nobg.png"
          alt="Peepz"
          width={96}
          height={96}
          className="animate-pulse"
          priority
        />
        {label ? (
          <div className="text-sm text-muted-foreground">
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
}


