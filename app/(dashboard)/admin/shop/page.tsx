import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) redirect("/dashboard");

  const items = await prisma.shopItem.findMany({
    where: { isActive: true },
    include: { sizeStocks: { orderBy: { size: "asc" } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <ShopClient
      initialItems={items}
      isAdmin={role === "ADMIN"}
      staffId={(session.user as any).id}
      staffName={session.user?.name ?? session.user?.email ?? "Staff"}
    />
  );
}
