import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KioskClient } from "./kiosk-client";

export default async function KioskPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/kiosk");

  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "KIOSK"].includes(role)) redirect("/dashboard");

  return <KioskClient />;
}
