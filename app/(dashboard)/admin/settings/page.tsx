import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";
import { isFeatureEnabled, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";
import { getLegalDocuments } from "@/lib/legal-documents";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const showSpecializedRoles = isFeatureEnabled(FLAG_SPECIALIZED_ROLES);

  // Fetched here (server-side) instead of via four separate client-mounted fetches --
  // each section used to fire its own request on mount, giving four sequential round
  // trips and four loading spinners on every visit to this page.
  const [branding, legalDocuments, kioskDevices, accounts] = await Promise.all([
    prisma.tenantBranding.findFirst(),
    getLegalDocuments(),
    showSpecializedRoles
      ? prisma.kioskDevice.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, label: true, createdAt: true } })
      : Promise.resolve([]),
    showSpecializedRoles
      ? Promise.all([
          prisma.user.findFirst({ where: { role: "KIOSK" }, select: { email: true, updatedAt: true } }),
          prisma.user.findFirst({ where: { role: "STORE" }, select: { email: true, updatedAt: true } }),
        ]).then(([kiosk, store]) => ({ kiosk, store }))
      : Promise.resolve({ kiosk: null, store: null }),
  ]);

  return (
    <SettingsClient
      showSpecializedRoles={showSpecializedRoles}
      initialBranding={branding}
      initialLegalDocuments={legalDocuments}
      initialKioskDevices={kioskDevices.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
      initialAccounts={{
        kiosk: accounts.kiosk ? { ...accounts.kiosk, updatedAt: accounts.kiosk.updatedAt.toISOString() } : null,
        store: accounts.store ? { ...accounts.store, updatedAt: accounts.store.updatedAt.toISOString() } : null,
      }}
    />
  );
}
