import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";
import { nextMemberNumber } from "@/lib/member-number";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

function generateTempPassword(): string {
  const { randomBytes } = require("crypto") as typeof import("crypto");
  return randomBytes(8).toString("hex"); // 16-char hex string, cryptographically secure
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const members = await prisma.member.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { lastName: "asc" },
    take: 500,
    include: {
      user: { select: { email: true } },
      subscriptions: { where: { status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }, include: { service: true } },
    },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { firstName, lastName, phone, emergencyName, emergencyPhone } = parsed.data;
  const email = parsed.data.email || undefined;
  const memberStatus = parsed.data.status ?? "ACTIVE";

  for (let attempt = 0; attempt < 3; attempt++) {
    const memberNumber = await nextMemberNumber();

    try {
      let memberId: string;

      if (email) {
        // Full member with user account
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const user = await prisma.user.create({
          data: {
            email,
            name: `${firstName} ${lastName}`,
            password: hashedPassword,
            role: "MEMBER",
            mustChangePassword: true,
            member: {
              create: { memberNumber, firstName, lastName, phone, emergencyName, emergencyPhone, status: memberStatus },
            },
          },
          include: { member: true },
        });

        if (memberStatus === "ACTIVE") {
          sendWelcomeEmail({ to: email, firstName, tempPassword }).catch(console.error);
        }

        memberId = user.member!.id;

        await logAudit({
          userId: (session.user as any).id,
          userName: session.user?.name ?? session.user?.email ?? "Unknown",
          action: "CREATE_MEMBER",
          entityType: "Member",
          entityId: memberId,
          entityName: `${firstName} ${lastName}`,
          description: `Created member account for ${firstName} ${lastName} (${email})`,
          metadata: { email, memberNumber, status: memberStatus },
        });

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        return NextResponse.json(member, { status: 201 });
      } else {
        // Guest member — no user account
        const member = await prisma.member.create({
          data: { memberNumber, firstName, lastName, phone, emergencyName, emergencyPhone, status: memberStatus },
        });

        await logAudit({
          userId: (session.user as any).id,
          userName: session.user?.name ?? session.user?.email ?? "Unknown",
          action: "CREATE_MEMBER",
          entityType: "Member",
          entityId: member.id,
          entityName: `${firstName} ${lastName}`,
          description: `Created guest member ${firstName} ${lastName} (${memberNumber})`,
          metadata: { memberNumber, status: memberStatus },
        });

        return NextResponse.json(member, { status: 201 });
      }
    } catch (e: any) {
      if (e?.code === "P2002" && e?.meta?.target?.includes("memberNumber") && attempt < 2) continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "Could not generate a unique member number. Please try again." }, { status: 500 });
}
