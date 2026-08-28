import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MembersClient } from "./members-client";

export const metadata = { title: "Members" };
export const revalidate = 60; // refresh at most every 60 seconds

const PAGE_SIZE = 50;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string };
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) redirect("/dashboard");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.search?.trim() ?? "";
  const statusFilter = searchParams.status ?? "ALL";

  const where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      // Multi-word query (e.g. "John Smith") -- match first+last together in either
      // order, same fix already applied to app/api/members/route.ts's own search.
      ...(search.split(/\s+/).length > 1
        ? (() => {
            const [first, ...rest] = search.split(/\s+/);
            const last = rest.join(" ");
            return [
              { AND: [{ firstName: { contains: first, mode: "insensitive" as const } }, { lastName: { contains: last, mode: "insensitive" as const } }] },
              { AND: [{ firstName: { contains: last, mode: "insensitive" as const } }, { lastName: { contains: first, mode: "insensitive" as const } }] },
            ];
          })()
        : []),
    ];
  }
  if (statusFilter === "ACTIVATED") {
    where.activatedAt = { not: null };
  } else if (statusFilter === "NOT_ACTIVATED") {
    where.activatedAt = null;
  } else if (statusFilter === "FREE_TRIAL") {
    where.source = "free-trial-registration";
    where.status = "INACTIVE";
  } else if (["ACTIVE", "INACTIVE", "FROZEN", "CANCELLED"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  const [members, total, freeTrialCount, services] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { lastName: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        subscriptions: {
          where: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          include: { service: { select: { name: true, color: true } } },
        },
        checkIns: { orderBy: { checkedInAt: "desc" }, take: 1 },
      },
    }),
    prisma.member.count({ where }),
    prisma.member.count({ where: { source: "free-trial-registration", status: "INACTIVE" } }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <MembersClient
      members={members}
      isAdmin={role === "ADMIN"}
      isStaff={role === "STAFF"}
      page={page}
      total={total}
      pageSize={PAGE_SIZE}
      freeTrialCount={freeTrialCount}
      services={services}
    />
  );
}
