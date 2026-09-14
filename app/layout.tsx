import type { Metadata, Viewport } from "next";
import { Khand } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { prisma } from "@/lib/db";
import { hexToHslTriplet, pickForegroundHsl } from "@/lib/color";

const khand = Khand({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

// Dynamic (not a static `metadata` export) so a tenant's own logo can replace the
// favicon/apple-touch-icon and browser tab title -- superadmin and the bare marketing
// domain never resolve a tenant (see middleware.ts), so this falls back to the
// platform's own assets there, same guard as getBrandStyle() below. `manifest` points
// at a Route Handler (app/api/manifest/route.ts), not Next's own manifest.ts
// convention file -- that convention auto-injects its link at the root in a way a
// nested layout's own `metadata.manifest` override (see kiosk/layout.tsx) can't
// actually take precedence over, so both need to be explicit Route Handlers instead.
export async function generateMetadata(): Promise<Metadata> {
  const tenantId = headers().get("x-tenant-id");
  const branding = tenantId ? await prisma.tenantBranding.findFirst().catch(() => null) : null;
  const gymName = branding?.gymName || "FlowForceRM";

  return {
    title: { default: gymName, template: `%s | ${gymName}` },
    description: `${gymName} — Gym Management System`,
    manifest: "/api/manifest",
    icons: branding?.logoUrl
      ? { icon: [{ url: branding.logoUrl }], apple: [{ url: branding.logoUrl }] }
      : {
          icon: [
            { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon.ico", sizes: "any" },
          ],
          apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
        },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: gymName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Superadmin and the bare marketing domain never resolve a tenant (see middleware.ts),
// so this is a no-op there and every tenant page gets its own colors automatically —
// no per-route opt-in needed.
async function getBrandStyle(): Promise<React.CSSProperties> {
  const tenantId = headers().get("x-tenant-id");
  if (!tenantId) return {};

  const branding = await prisma.tenantBranding.findFirst().catch(() => null);
  if (!branding) return {};

  const style: Record<string, string> = {};
  if (branding.primaryColor) {
    const hsl = hexToHslTriplet(branding.primaryColor);
    if (hsl) {
      style["--primary"] = hsl;
      style["--ring"] = hsl;
      style["--primary-foreground"] = pickForegroundHsl(branding.primaryColor);
    }
  }
  if (branding.accentColor) {
    const hsl = hexToHslTriplet(branding.accentColor);
    if (hsl) {
      style["--accent"] = hsl;
      style["--accent-foreground"] = pickForegroundHsl(branding.accentColor);
    }
  }
  return style as React.CSSProperties;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brandStyle = await getBrandStyle();
  return (
    <html lang="en" suppressHydrationWarning style={brandStyle}>
      <body className={khand.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
