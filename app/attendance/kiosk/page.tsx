import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const FaceKiosk = dynamic(
  () => import("@/components/face-recognition/FaceKiosk").then((m) => m.FaceKiosk),
  { ssr: false }
);

export default async function KioskPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/attendance/kiosk");

  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  return <FaceKiosk />;
}
