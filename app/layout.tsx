import type { Metadata, Viewport } from "next";
import { Khand } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { prisma } from "@/lib/db";
import { hexToHslTriplet, pickForegroundHsl } from "@/lib/color";

const khand = Khand({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "FlowForceRM", template: "%s | FlowForceRM" },
  description: "FlowForceRM — Gym Management System",
  manifest: "/manifest.json",
  icons: {
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
    title: "FlowForceRM",
  },
};

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
