import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const search = searchParams.get("search")?.trim() || null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  function parseManilaDate(str: string, endOfDay = false): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    const suffix = endOfDay ? "T23:59:59.999+08:00" : "T00:00:00+08:00";
    const d = new Date(`${str}${suffix}`);
    return isNaN(d.getTime()) ? null : d;
  }

  const fromDate = from ? parseManilaDate(from) : null;
  const toDate = to ? parseManilaDate(to, true) : null;

  if ((from && !fromDate) || (to && !toDate)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const where = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(search ? { entityName: { contains: search, mode: "insensitive" as const } } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total });
}
