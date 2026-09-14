import { NextRequest, NextResponse } from "next/server";
import { resolveBrandingFromHost } from "@/lib/resolve-branding-from-host";

// A regular Route Handler, not the app/manifest.ts convention file -- that convention
// is root-only in Next.js (nesting it under app/kiosk/ 404s), so the kiosk's own
// manifest needs its own explicit `metadata.manifest` reference (see kiosk/layout.tsx)
// pointing here instead. Kiosk tablets get "Add to Home Screen"'d too, so this needs
// the same tenant-aware treatment as the root manifest (app/manifest.ts).
export async function GET(req: NextRequest) {
  const tenant = await resolveBrandingFromHost(req.headers.get("host") ?? "");
  const gymName = tenant?.brandName || "FlowForceRM";

  const manifest = {
    name: `${gymName} Check-In Kiosk`,
    short_name: `${gymName} Kiosk`,
    description: `${gymName} — Member Check-In`,
    start_url: "/kiosk",
    scope: "/kiosk",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    icons: tenant?.logoUrl
      ? [{ src: tenant.logoUrl, sizes: "any", type: "image/png", purpose: "any" }]
      : [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
    categories: ["business", "fitness"],
  };

  return NextResponse.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
