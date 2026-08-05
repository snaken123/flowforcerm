import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, reason: "missing" });

  const record = await prisma.freeTrialToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ valid: false, reason: "not_found" });
  if (record.usedAt) return NextResponse.json({ valid: false, reason: "used" });
  if (new Date() > record.expiresAt) return NextResponse.json({ valid: false, reason: "expired" });

  return NextResponse.json({
    valid: true,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    expiresAt: record.expiresAt.toISOString(),
  });
}
