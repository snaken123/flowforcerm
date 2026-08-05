import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const patchSchema = z.object({
  startDate: z.string().regex(DATE_RE, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(DATE_RE, "Date must be YYYY-MM-DD").nullable(),
  sessionsUsed: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  reason: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldMessages = Object.entries(flat.fieldErrors)
      .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
      .join("; ");
    const message = fieldMessages || flat.formErrors.join("; ") || "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // CRIT-5: Cross-field date validation
  if (parsed.data.endDate && parsed.data.startDate > parsed.data.endDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { member: true, employee: { select: { firstName: true, lastName: true } }, service: true },
    });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const oldStart = sub.startDate;
    const oldEnd = sub.endDate;
    const oldSessionsUsed = sub.sessionsUsed;

    const updateData: any = {
      startDate: new Date(parsed.data.startDate + "T00:00:00Z"),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate + "T00:00:00Z") : null,
    };
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.sessionsUsed !== undefined && sub.sessionsTotal !== null) {
      if (parsed.data.sessionsUsed > sub.sessionsTotal) {
        return NextResponse.json(
          { error: `Sessions used cannot exceed total sessions (${sub.sessionsTotal})` },
          { status: 400 }
        );
      }
      updateData.sessionsUsed = parsed.data.sessionsUsed;
    }

    // HIGH-7: Auto-update status when sessions are edited
    if (sub.sessionsTotal !== null) {
      const newSessionsUsed = updateData.sessionsUsed ?? sub.sessionsUsed;
      if (newSessionsUsed >= sub.sessionsTotal) {
        updateData.status = "EXPIRED";
      } else if (sub.status === "EXPIRED") {
        updateData.status = "ACTIVE";
      }
    }

    await prisma.subscription.update({ where: { id: params.id }, data: updateData });

    const sessionsPart = parsed.data.sessionsUsed !== undefined && sub.sessionsTotal !== null
      ? ` Sessions used: ${oldSessionsUsed} → ${updateData.sessionsUsed} (of ${sub.sessionsTotal}).`
      : "";

    await logAudit({
      userId: (session.user as any).id,
      userName: session.user?.name ?? session.user?.email ?? "Unknown",
      action: "EDIT_SUBSCRIPTION",
      entityType: "Subscription",
      entityId: params.id,
      entityName: `${sub.member?.firstName ?? sub.employee?.firstName ?? "?"} ${sub.member?.lastName ?? sub.employee?.lastName ?? "?"} — ${sub.service.name}`,
      description: `Edited ${sub.service.name}. Dates: ${oldStart?.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) ?? "none"} – ${oldEnd?.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) ?? "none"} → ${parsed.data.startDate} – ${parsed.data.endDate ?? "none"}.${sessionsPart} Reason: ${parsed.data.reason}`,
      metadata: { reason: parsed.data.reason, memberId: sub.memberId, serviceId: sub.serviceId },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[subscription-update]", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

const deleteSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  password: z.string().min(1, "Password is required"),
});

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // CRIT-1: Verify subscription exists before touching password
  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: { member: true, employee: { select: { firstName: true, lastName: true } }, service: true },
  });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // CRIT-3: Block deletion if attendance history exists
  const bookingCount = await prisma.booking.count({ where: { subscriptionId: params.id } });
  if (bookingCount > 0) {
    return NextResponse.json({
      error: `Cannot delete a subscription with ${bookingCount} attendance record${bookingCount !== 1 ? "s" : ""}. Cancel it instead.`,
    }, { status: 409 });
  }

  // Verify admin password
  const admin = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { password: true },
  });

  if (!admin?.password) {
    return NextResponse.json({ error: "Cannot verify password" }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.password);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await prisma.subscription.delete({ where: { id: params.id } });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "DELETE_MEMBERSHIP",
    entityType: "Subscription",
    entityId: params.id,
    entityName: `${sub.member?.firstName ?? sub.employee?.firstName ?? "?"} ${sub.member?.lastName ?? sub.employee?.lastName ?? "?"} — ${sub.service.name}`,
    description: `Deleted ${sub.service.name} membership. Reason: ${parsed.data.reason}`,
    metadata: { reason: parsed.data.reason, memberId: sub.memberId, serviceId: sub.serviceId },
  });

  return NextResponse.json({ success: true });
}
