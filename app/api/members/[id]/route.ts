import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "FROZEN", "INACTIVE", "CANCELLED"]).optional(),
  memberNumber: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRel: z.string().optional(),
  waiverSigned: z.boolean().optional(),
  guardianUserId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Members can only read their own profile
  if (role === "MEMBER") {
    const ownMember = await prisma.member.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!ownMember || ownMember.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true } },
      subscriptions: { include: { service: true } },
      checkIns: { orderBy: { checkedInAt: "desc" }, take: 10 },
      rankRecords: { orderBy: { awardedAt: "desc" } },
    },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip sensitive fields when a member reads their own record
  if (role === "MEMBER") {
    const { medicalNotes, notes, emergencyName, emergencyPhone, emergencyRel, ...safe } = member as any;
    return NextResponse.json(safe);
  }

  // STORE staff can confirm identity but must not see membership financial data
  if (role === "STORE") {
    const { subscriptions, notes, medicalNotes, emergencyName, emergencyPhone, emergencyRel, ...safe } = member as any;
    return NextResponse.json(safe);
  }

  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Members may only update their own emergency contact, phone, dateOfBirth, and address
  // photoUrl must be set via /api/upload (Vercel Blob) only
  if (role === "MEMBER") {
    const memberSelfUpdateSchema = z.object({
      emergencyName: z.string().max(100).optional(),
      emergencyPhone: z.string().max(20).optional(),
      emergencyRel: z.string().max(50).optional(),
      phone: z.string().max(20).optional().nullable(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      source: z.string().min(1).max(100).optional(),
    });
    const body = await req.json();
    const parsed = memberSelfUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const ownMember = await prisma.member.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!ownMember || ownMember.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const data: any = { ...parsed.data };
    if ("dateOfBirth" in data) {
      data.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    const updated = await prisma.member.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  }

  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // STAFF can update front-desk fields but not admin-only fields
  if (role === "STAFF") {
    const allowedForStaff: any = {};
    const { notes, phone, address, emergencyName, emergencyPhone, emergencyRel, gender, dateOfBirth } = parsed.data;
    if (notes !== undefined) allowedForStaff.notes = notes;
    if (phone !== undefined) allowedForStaff.phone = phone;
    if (address !== undefined) allowedForStaff.address = address;
    if (emergencyName !== undefined) allowedForStaff.emergencyName = emergencyName;
    if (emergencyPhone !== undefined) allowedForStaff.emergencyPhone = emergencyPhone;
    if (emergencyRel !== undefined) allowedForStaff.emergencyRel = emergencyRel;
    if (gender !== undefined) allowedForStaff.gender = gender;
    if (dateOfBirth !== undefined) allowedForStaff.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    const member = await prisma.member.update({ where: { id: params.id }, data: allowedForStaff });
    return NextResponse.json(member);
  }

  const { email, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (updateData.waiverSigned) updateData.waiverDate = new Date();
  if ("dateOfBirth" in updateData) {
    updateData.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
  }
  // Update email on linked user if provided
  if (email) {
    const existing = await prisma.member.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (existing?.userId) {
      await prisma.user.update({ where: { id: existing.userId }, data: { email } });
    }
  }

  try {
    const member = await prisma.member.update({ where: { id: params.id }, data: updateData });

    const changedFields = Object.keys(parsed.data).filter((k) => k !== "email");
    if (changedFields.length > 0) {
      await logAudit({
        userId: (session.user as any).id,
        userName: session.user?.name ?? session.user?.email ?? "Unknown",
        action: "UPDATE_MEMBER",
        entityType: "Member",
        entityId: params.id,
        entityName: `${member.firstName} ${member.lastName}`,
        description: `Updated member profile for ${member.firstName} ${member.lastName} (fields: ${changedFields.join(", ")})`,
        metadata: { updatedFields: changedFields },
      });
    }

    return NextResponse.json(member);
  } catch (e: any) {
    console.error("[member-update]", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { adminPassword } = body;
  if (!adminPassword) return NextResponse.json({ error: "Admin password is required." }, { status: 400 });

  const adminUser = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!adminUser) return NextResponse.json({ error: "Admin user not found." }, { status: 403 });

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(adminPassword, adminUser.password ?? "");
  if (!valid) return NextResponse.json({ error: "Incorrect admin password." }, { status: 403 });

  const memberId = params.id;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { firstName: true, lastName: true, userId: true },
  });

  // Delete all related records before deleting member. Order matters:
  // FreeTrialFollowUp references both Subscription and CheckIn, so it has to
  // go first, before either of those. Sales/inventory history is preserved --
  // ShopSale.buyerMemberId is nullified, not deleted, and staff-facing
  // ShopInventoryLog has no member reference at all.
  await prisma.$transaction(async (tx) => {
    await tx.freeTrialFollowUp.deleteMany({ where: { memberId } });
    await tx.membershipFreezeRequest.deleteMany({ where: { memberId } });
    await tx.shopSale.updateMany({ where: { buyerMemberId: memberId }, data: { buyerMemberId: null } });
    await tx.payment.deleteMany({ where: { memberId } });
    await tx.checkIn.deleteMany({ where: { memberId } });
    await tx.rankRecord.deleteMany({ where: { memberId } });
    await tx.booking.deleteMany({ where: { memberId } });
    await tx.subscription.deleteMany({ where: { memberId } });
    await tx.member.delete({ where: { id: memberId } });
    // Guest members (front-desk-only records, no login) have no User row.
    // EmailIntegration cascades automatically (onDelete: Cascade on that relation).
    // AuditLog.userId is RESTRICT at the DB level -- a member who ever acted as
    // themselves (e.g. submitted a privacy request) would otherwise block this
    // delete with a raw FK error. Only rows where they were the actor are
    // removed; the DELETE_MEMBER entry this action itself creates is attributed
    // to the deleting admin, not the member, so it's untouched.
    if (member?.userId) {
      await tx.auditLog.deleteMany({ where: { userId: member.userId } });
      await tx.user.delete({ where: { id: member.userId } });
    }
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "DELETE_MEMBER",
    entityType: "Member",
    entityId: memberId,
    entityName: member ? `${member.firstName} ${member.lastName}` : memberId,
    description: `Permanently deleted member ${member ? `${member.firstName} ${member.lastName}` : memberId} and all associated records`,
    metadata: {},
  });

  return NextResponse.json({ success: true });
}
