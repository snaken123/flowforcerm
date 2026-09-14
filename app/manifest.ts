import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { findTenantBySubdomain } from "@/control-plane/lib/tenant-resolution";

const ROOT_DOMAIN_HOSTS = new Set(["flowforcerm.com", "www.flowforcerm.com", "localhost:3000"]);

// A convention file (like sitemap.ts), auto-served at /manifest.webmanifest with the
// right content-type and auto-linked from every page's <head> -- no manifest entry
// needed in layout.tsx's own metadata. Dynamic so "Add to Home Screen" on a tenant's
// own subdomain installs their own logo, not FlowForceRM's.
//
// Can't rely on x-tenant-id here the way normal pages do -- middleware's own matcher
// deliberately skips anything with "manifest" in the path (same exclusion list as
// favicon/icons/static assets, for the same performance reason: avoid a tenant-
// resolution round trip on every static-asset-shaped request), so this resolves the
// tenant itself from the Host header instead, going straight to the control-plane DB
// rather than through middleware's Redis-cached resolver -- fine here since browsers
// fetch this rarely and cache it aggressively.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = headers().get("host") ?? "";
  const isSuperAdmin = host.startsWith("superadmin.");
  const subdomain = host.split(":")[0].split(".")[0];

  const tenant = !isSuperAdmin && !ROOT_DOMAIN_HOSTS.has(host)
    ? await findTenantBySubdomain(subdomain).catch(() => null)
    : null;

  const gymName = tenant?.brandName || "FlowForceRM";

  return {
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
}
