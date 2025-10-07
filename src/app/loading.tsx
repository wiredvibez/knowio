"use client";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function AppLoading() {
  return <LoadingOverlay show label="טוען..." blocking={false} />;
}


