import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, color, location, notes, allowedServiceIds } = body;

  const updated = await prisma.classSession.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(color && { color }),
      location: location || null,
      notes: notes || null,
      ...(allowedServiceIds !== undefined && {
        allowedServices: {
          deleteMany: {},
          create: (allowedServiceIds as string[]).map((sid: string) => ({ serviceId: sid })),
        },
      }),
    },
    include: {
      allowedServices: { include: { service: { select: { id: true, name: true, color: true } } } },
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Booking.sessionId -> ClassSession is a Restrict FK, so this would already fail at the
  // database level with a raw, unhandled error -- this check just turns that into a clean
  // 409 with a clear message instead.
  const bookingCount = await prisma.booking.count({ where: { sessionId: params.id } });
  if (bookingCount > 0) {
    return NextResponse.json({
      error: `Cannot delete a class with ${bookingCount} booking${bookingCount !== 1 ? "s" : ""} (active or historical). Remove or reassign them first.`,
    }, { status: 409 });
  }

  await prisma.classSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}