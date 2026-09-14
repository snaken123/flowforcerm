import { NextRequest, NextResponse } from "next/server";
import { resolveBrandingFromHost } from "@/lib/resolve-branding-from-host";

// A regular Route Handler, not Next's app/manifest.ts convention file -- that
// convention auto-injects its <link rel="manifest"> at the root and a nested layout's
// own `metadata.manifest` override (see kiosk/layout.tsx) doesn't actually take
// precedence over it, so both the default and kiosk manifests need to be explicit
// Route Handlers referenced via `metadata.manifest` for the override to work at all.
// Dynamic so "Add to Home Screen" on a tenant's own subdomain installs their own logo.
export async function GET(req: NextRequest) {
  const tenant = await resolveBrandingFromHost(req.headers.get("host") ?? "");
  const gymName = tenant?.brandName || "FlowForceRM";

  const manifest = {
    name: gymName,
    short_name: gymName,
    description: `${gymName} — Gym Management System`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d0d",
    theme_color: tenant?.primaryColor || "#111111",
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
