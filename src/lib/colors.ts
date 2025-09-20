// Simple pastel color generator and contrast chooser

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function generatePastelHex(seed?: number): string {
  const rnd = seed != null ? Math.abs(Math.sin(seed) * 10000) % 1 : Math.random();
  const h = Math.floor(rnd * 360);
  const s = 50; // low saturation for pastel
  const l = 85; // high lightness for pastel
  return hslToHex(h, s, l);
}

export function bestTextTone(hex: string): "light" | "dark" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // relative luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "dark" : "light";
}


