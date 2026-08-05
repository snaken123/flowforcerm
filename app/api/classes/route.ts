import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, color, location, notes, allowedServiceIds } = body;

  if (!name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const classSession = await prisma.classSession.create({
    data: {
      name,
      color: color || "#3B82F6",
      location: location || null,
      notes: notes || null,
      allowedServices: allowedServiceIds?.length
        ? { create: (allowedServiceIds as string[]).map((sid: string) => ({ serviceId: sid })) }
        : undefined,
    },
    include: {
      allowedServices: { include: { service: { select: { id: true, name: true, color: true } } } },
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json(classSession, { status: 201 });
}
