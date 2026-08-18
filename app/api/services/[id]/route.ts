import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  color: z.string().optional(),
  monthlyPrice: z.number().min(0).optional(),
  dropInPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  freeTrialEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = await prisma.service.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(service);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Subscription.serviceId is required, so an unguarded delete here would cascade into
  // deleting every subscription ever sold for this service -- including active, paying
  // members' memberships. Block it the same way subscription deletion already blocks on
  // existing bookings, rather than relying solely on the DB-level onDelete: Restrict.
  const subscriptionCount = await prisma.subscription.count({ where: { serviceId: params.id } });
  if (subscriptionCount > 0) {
    return NextResponse.json({
      error: `Cannot delete a service with ${subscriptionCount} subscription${subscriptionCount !== 1 ? "s" : ""} (active or historical). Deactivate it instead.`,
    }, { status: 409 });
  }

  await prisma.service.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
