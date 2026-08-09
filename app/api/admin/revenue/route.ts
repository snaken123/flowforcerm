import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDayBoundaries } from "@/lib/time";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type"); // "daily" | "monthly"
  const dateStr = searchParams.get("date"); // YYYY-MM-DD for daily
  const year = parseInt(searchParams.get("year") ?? "0", 10);
  const month = parseInt(searchParams.get("month") ?? "0", 10); // 1-based

  let start: Date, end: Date;

  const pad = (n: number) => String(n).padStart(2, "0");
  if (type === "daily" && dateStr) {
    ({ start, end } = manilaDayBoundaries(dateStr));
  } else if (type === "monthly" && year && month) {
    const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
    start = manilaDayBoundaries(`${year}-${pad(month)}-01`).start;
    end = manilaDayBoundaries(`${year}-${pad(month)}-${pad(lastDay)}`).end;
  } else {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const [payments, shopSales] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      include: {
        member: { select: { firstName: true, lastName: true, memberNumber: true } },
        employee: { select: { firstName: true, lastName: true } },
        subscription: { include: { service: { select: { name: true } } } },
      },
      orderBy: { paidAt: "asc" },
    }),
    prisma.shopSale.findMany({
      where: { resolvedAt: { gte: start, lte: end } },
      orderBy: { resolvedAt: "asc" },
    }),
  ]);

  const rows = payments.map((p) => ({
    id: p.id,
    memberName: p.member
      ? `${p.member.firstName} ${p.member.lastName}`
      : p.employee
        ? `${p.employee.firstName} ${p.employee.lastName} (Staff)`
        : "—",
    memberNumber: p.member?.memberNumber ?? "",
    service: (p as any).subscription?.service?.name ?? "—",
    amount: Number(p.amount),
    method: (p as any).method ?? "—",
    paidAt: p.paidAt?.toISOString() ?? p.createdAt.toISOString(),
    notes: (p as any).notes ?? "",
  }));

  const shopTotal = shopSales.reduce((s, r) => s + Number(r.total), 0);
  const paymentTotal = rows.reduce((s, r) => s + r.amount, 0);
  const total = paymentTotal + shopTotal;

  return NextResponse.json({ total, payments: rows, shopTotal, shopSalesCount: shopSales.length });
}
