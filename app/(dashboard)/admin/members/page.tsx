import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MembersClient } from "./members-client";

export const metadata = { title: "Athletes" };
export const revalidate = 60; // refresh at most every 60 seconds

const PAGE_SIZE = 50;

async function fetchBouncedEmails(): Promise<Set<string>> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return new Set();
  try {
    const res = await fetch("https://api.resend.com/suppressions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    const records: { email: string }[] = data.data ?? data.records ?? [];
    return new Set(records.map((r) => r.email.toLowerCase()));
  } catch {
    return new Set();
  }
}

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

  const [members, total, bouncedEmails, freeTrialCount] = await Promise.all([
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
    fetchBouncedEmails(),
    prisma.member.count({ where: { source: "free-trial-registration", status: "INACTIVE" } }),
  ]);

  return (
    <Suspense fallback={null}>
      <MembersClient
        members={members}
        isAdmin={role === "ADMIN"}
        isStaff={role === "STAFF"}
        bouncedEmails={[...bouncedEmails]}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        freeTrialCount={freeTrialCount}
      />
    </Suspense>
  );
}
