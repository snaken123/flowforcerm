// Converts a tenant's branding hex color into this app's HSL CSS custom property
// format ("H S% L%", no hsl() wrapper — matches how --primary/--accent are defined
// in globals.css and consumed via Tailwind's hsl(var(--primary)) color tokens).

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

export function hexToHslTriplet(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return `${h.toFixed(1)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// WCAG relative luminance — picks a legible foreground (near-black or near-white,
// reusing this app's existing design-token values) against an arbitrary brand color.
export function pickForegroundHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "210 40% 98%";
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "222.2 47.4% 11.2%" : "210 40% 98%";
}
