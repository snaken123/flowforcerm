import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { isFeatureEnabled, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  return <SettingsClient showSpecializedRoles={isFeatureEnabled(FLAG_SPECIALIZED_ROLES)} />;
}
