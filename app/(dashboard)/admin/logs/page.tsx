import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogsClient } from "./logs-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await getAuthSession();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  // Fetch staff/admin users for the filter dropdown
  const [users, services] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      include: {
        packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">All staff and admin actions are recorded here.</p>
      </div>
      <LogsClient users={users} services={services} />
    </div>
  );
}
