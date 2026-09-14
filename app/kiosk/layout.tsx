// Points at a dynamic Route Handler (app/api/kiosk-manifest/route.ts), not the old
// static public/kiosk-manifest.json -- Next's own manifest.ts convention file is
// root-only (nesting it under this segment 404s), so a tenant-aware kiosk manifest
// needs this explicit override instead.
// Points at a dynamic Route Handler (app/api/kiosk-manifest/route.ts), not the old
// static public/kiosk-manifest.json -- Next's own manifest.ts convention file is
// root-only (nesting it under this segment 404s), so a tenant-aware kiosk manifest
// needs this explicit override instead.
export const metadata = {
  manifest: "/api/kiosk-manifest",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden">{children}</div>;
}
