import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getResend, tenantOrigin } from "@/lib/email";
import { getTenantSubdomain } from "@/lib/tenant-context";
import { manilaDayBoundaries } from "@/lib/time";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type SelectedClass = {
  serviceId: string;
  scheduleId: string;
  classSessionId: string;
  date: string; // YYYY-MM-DD
};

export async function POST(req: NextRequest) {
  const { token, selections }: { token: string; selections: SelectedClass[] } = await req.json();

  if (!token || !selections?.length) {
    return NextResponse.json({ error: "Missing token or selections" }, { status: 400 });
  }

  // Validate token
  const freeTrialToken = await prisma.freeTrialToken.findUnique({ where: { token } });
  if (!freeTrialToken) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (freeTrialToken.usedAt) return NextResponse.json({ error: "Token already used" }, { status: 400 });
  if (new Date() > freeTrialToken.expiresAt) return NextResponse.json({ error: "Token expired" }, { status: 400 });

  // Double-check email not already in system
  const existingUser = await prisma.user.findUnique({ where: { email: freeTrialToken.email } });
  if (existingUser) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  // Create user + member (INACTIVE, no member number)
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: freeTrialToken.email,
      name: `${freeTrialToken.firstName} ${freeTrialToken.lastName}`,
      password: hashedPassword,
      role: "MEMBER",
      mustChangePassword: true,
    },
  });

  const member = await prisma.member.create({
    data: {
      userId: user.id,
      firstName: freeTrialToken.firstName,
      lastName: freeTrialToken.lastName,
      phone: freeTrialToken.phone,
      status: "INACTIVE",
      source: "free-trial-registration",
      joinDate: new Date(),
    },
  });

  // Find free trial packages for each service
  const serviceIds = [...new Set(selections.map((s) => s.serviceId))];
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    include: {
      packages: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  // Create subscriptions + bookings for each selected class
  for (const sel of selections) {
    const svc = serviceMap[sel.serviceId];
    if (!svc) continue;

    const freePkg = svc.packages.find((p) =>
      p.name.toLowerCase().includes("free") || p.name.toLowerCase().includes("trial")
    );

    const { start: classDate, end: endOfDay } = manilaDayBoundaries(sel.date);

    const sub = await prisma.subscription.create({
      data: {
        memberId: member.id,
        serviceId: sel.serviceId,
        status: "ACTIVE",
        price: 0,
        isTrial: true,
        startDate: classDate,
        endDate: endOfDay,
        sessionsTotal: freePkg?.sessions ?? 1,
        sessionsUsed: 0,
        notes: `Free trial — registered online`,
      },
    });

    await prisma.freeTrialFollowUp.create({
      data: { memberId: member.id, subscriptionId: sub.id },
    });

    // Create a booking so the slot shows as booked on the schedule
    await prisma.booking.create({
      data: {
        memberId: member.id,
        sessionId: sel.classSessionId,
        scheduleId: sel.scheduleId,
        scheduledDate: new Date(sel.date + "T00:00:00Z"),
        subscriptionId: sub.id,
        status: "CONFIRMED",
      },
    });
  }

  // Mark token as used
  await prisma.freeTrialToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  // Build class summary for emails
  const classSummary = selections.map((sel) => {
    const svc = serviceMap[sel.serviceId];
    const d = new Date(sel.date + "T00:00:00");
    const dateStr = d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return `<li style="margin-bottom:6px"><strong>${svc?.name ?? "Class"}</strong> — ${dateStr}</li>`;
  }).join("");

  // Confirmation email to registrant
  await getResend().emails.send({
    from: "FlowForceRM <noreply@flowforcerm.com>",
    replyTo: "members@flowforcerm.com",
    to: freeTrialToken.email,
    subject: "You're booked! Free trial at FlowForceRM",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
        <div style="margin-bottom:24px"><strong style="font-size:18px">FlowForceRM</strong></div>
        <h2 style="margin:0 0 12px">You're all set, ${freeTrialToken.firstName}! 🥋</h2>
        <p style="font-size:15px;line-height:1.6;color:#444">
          Your free trial class${selections.length > 1 ? "es have" : " has"} been reserved:
        </p>
        <ul style="font-size:15px;line-height:1.8;color:#333;padding-left:20px">${classSummary}</ul>
        <p style="font-size:15px;line-height:1.6;color:#444">
          Please arrive <strong>15 minutes early</strong> and wear comfortable clothing.
          Our front desk will be expecting you!
        </p>
        <p style="font-size:14px;color:#666;margin-top:24px">
          Questions? Reply to this email or call us. We can't wait to see you on the mats!
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#aaa">FlowForceRM · members@flowforcerm.com</p>
      </div>
    `,
  });

  // Staff notification
  await getResend().emails.send({
    from: "FlowForceRM <noreply@flowforcerm.com>",
    to: "members@flowforcerm.com",
    subject: `New free trial registration — ${freeTrialToken.firstName} ${freeTrialToken.lastName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin:0 0 16px">New Free Trial Registration</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#888;width:120px">Name</td><td><strong>${freeTrialToken.firstName} ${freeTrialToken.lastName}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td>${freeTrialToken.email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Phone</td><td>${freeTrialToken.phone}</td></tr>
        </table>
        <p style="margin-top:16px;font-size:14px;color:#444">Booked classes:</p>
        <ul style="font-size:14px;line-height:1.8;color:#333;padding-left:20px">${classSummary}</ul>
        <p style="font-size:13px;color:#888;margin-top:16px">
          View their profile in the CRM: <a href="${tenantOrigin(getTenantSubdomain())}/admin/members">${tenantOrigin(getTenantSubdomain())}/admin/members</a>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
