import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneToE164(input: string): { e164?: string; error?: string } {
  const value = (input || "").trim();
  if (!value) return { e164: "" };
  if (/^0\d{9}$/.test(value)) {
    const local = value.replace(/^0/, "");
    return { e164: `+972${local}` };
  }
  if (/^\+\d{8,15}$/.test(value)) {
    return { e164: value };
  }
  return { error: "מספר לא חוקי. השתמשו בפורמט 050... או +..." };
}
