"use client";
import { Input } from "@/components/ui/input";

// Stub for Google Places (to be wired later)
export function AddressPicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="כתובת" />;
}


