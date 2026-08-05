import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "FlowForceRM <noreply@flowforcerm.com>";

export async function GET() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const history = await prisma.broadcast.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
  });
  return NextResponse.json(history);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const { subject, body, audience, memberIds, serviceIds } = await req.json();
    if (!subject || !body) return NextResponse.json({ error: "Subject and body required" }, { status: 400 });

    const where: any = {};
    if (audience === "active") where.status = "ACTIVE";
    if (audience === "inactive") where.status = "INACTIVE";
    if (audience === "specific" && Array.isArray(memberIds)) where.id = { in: memberIds };
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      where.subscriptions = { some: { serviceId: { in: serviceIds }, status: "ACTIVE" } };
    }

    const members = await prisma.member.findMany({
      where,
      select: { firstName: true, user: { select: { email: true } } },
    });

    const recipients = members.flatMap((m) => m.user ? [{ name: m.firstName, email: m.user.email! }] : []).filter((r) => !!r.email && !r.email.endsWith("@flowforcerm.local"));
    if (recipients.length === 0) return NextResponse.json({ error: "No recipients found" }, { status: 400 });

    const results = { sent: 0, failed: 0, error: "" };
    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);
      try {
        const sendResult = await resend.batch.send(batch.map((r) => ({
          from: FROM,
          replyTo: "members@flowforcerm.com",
          to: r.email,
          subject,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
              <div style="margin-bottom:24px"><strong style="font-size:16px">FlowForceRM</strong></div>
              <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#333">${body.replace(/\n/g, "<br/>")}</div>
              <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
              <p style="font-size:12px;color:#9ca3af">You received this email because you are a member of FlowForceRM.</p>
            </div>
          `,
        })));
        if (sendResult.error) {
          console.error("[broadcast] Resend error:", sendResult.error);
          results.failed += batch.length;
          results.error = sendResult.error.message ?? String(sendResult.error);
        } else {
          results.sent += batch.length;
        }
      } catch (e: any) {
        console.error("[broadcast] batch exception:", e?.message ?? e);
        results.failed += batch.length;
        results.error = e?.message ?? "Send failed";
      }
    }

    // Save to history
    if (results.sent > 0) {
      await prisma.broadcast.create({
        data: { subject, body, audience, recipientCount: results.sent, sentById: userId },
      });
    }

    return NextResponse.json({ sent: results.sent, failed: results.failed, error: results.error || undefined });
  } catch (e: any) {
    console.error("[broadcast] unhandled error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 });
  }
}
