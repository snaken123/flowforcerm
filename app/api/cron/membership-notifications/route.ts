import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { manilaDateStr, manilaDayBoundaries } from "@/lib/time";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXTAUTH_URL ?? "https://app.northsouth.com.ph";
const FROM = "NorthSouth Fight Sports <no-reply@northsouth.com.ph>";

async function getSetting(key: string) {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

function memberName(m: any) {
  return `${m.firstName} ${m.lastName}`;
}

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// Convert plain text (double-newline = paragraph, single = <br>) to HTML
function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

// Default templates — mirror current hardcoded behaviour
const DEFAULT_WARN_SUBJECT = "Your {{service_name}} membership expires in {{warn_days}} day(s)";
const DEFAULT_WARN_BODY = `Hi {{member_name}},

This is a reminder that your {{service_name}} membership at NorthSouth Fight Sports will expire on {{expiry_date}} — that's {{warn_days}} day(s) from now.

{{sessions_remaining}}

To renew, please visit the gym or contact us.

See you on the mats!
NorthSouth Fight Sports`;

const DEFAULT_EXPIRED_SUBJECT = "Your {{service_name}} membership has expired";
const DEFAULT_EXPIRED_BODY = `Hi {{member_name}},

This is a reminder that {{expiry_reason}} for your {{service_name}} membership at NorthSouth Fight Sports.

We'd love to have you continue training with us! Please visit the gym or reach out to renew.

See you soon!
NorthSouth Fight Sports`;

export async function GET(req: NextRequest) {
  // Vercel cron calls this with Authorization header
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [warnEnabled, warnDaysStr, expiredEnabled,
    warnSubjectTpl, warnBodyTpl, expiredSubjectTpl, expiredBodyTpl,
  ] = await Promise.all([
    getSetting("expiry_warning_enabled"),
    getSetting("expiry_warning_days"),
    getSetting("expired_notification_enabled"),
    getSetting("expiry_warning_subject"),
    getSetting("expiry_warning_body"),
    getSetting("expired_notification_subject"),
    getSetting("expired_notification_body"),
  ]);

  const warnDays = parseInt(warnDaysStr ?? "7", 10);
  const results: string[] = [];

  // ── 1. Expiry warning ──────────────────────────────────────────────────────
  if (warnEnabled === "true") {
    const targetDateObj = new Date();
    targetDateObj.setDate(targetDateObj.getDate() + warnDays);
    const targetStr = manilaDateStr(targetDateObj);
    const { start: targetStart, end: targetEnd } = manilaDayBoundaries(targetStr);

    const expiringSoon = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: targetStart, lte: targetEnd },
      },
      include: {
        service: true,
        member: { include: { user: { select: { email: true } } } },
      },
    });

    const subjectTpl = warnSubjectTpl || DEFAULT_WARN_SUBJECT;
    const bodyTpl = warnBodyTpl || DEFAULT_WARN_BODY;

    const warnTasks = expiringSoon.map(async (sub) => {
      const email = sub.member?.user?.email;
      if (!email || !sub.member) return;
      const name = memberName(sub.member);
      const isSessionBased = sub.sessionsTotal !== null;
      const sessionsLeft = isSessionBased ? sub.sessionsTotal! - sub.sessionsUsed : null;
      const expiryDate = sub.endDate
        ? sub.endDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : "";
      const sessionsRemaining = isSessionBased && sessionsLeft !== null
        ? `You have ${sessionsLeft} session${sessionsLeft !== 1 ? "s" : ""} remaining on this membership.`
        : "";

      const vars = {
        member_name: name,
        service_name: sub.service.name,
        expiry_date: expiryDate,
        warn_days: String(warnDays),
        sessions_remaining: sessionsRemaining,
      };

      const subject = render(subjectTpl, vars);
      const bodyHtml = textToHtml(render(bodyTpl, vars)) +
        `\n<hr/><p style="font-size:12px;color:#888;">Manage your account at <a href="${APP_URL}">${APP_URL}</a></p>`;

      await resend.emails.send({
        from: FROM,
        replyTo: "members@northsouth.com.ph",
        to: email,
        subject,
        html: bodyHtml,
      });
      results.push(`warn:${email}:${sub.service.name}`);
    });
    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < warnTasks.length; i += 10) {
      await Promise.all(warnTasks.slice(i, i + 10));
    }
  }

  // ── 2. Expired / last session used notification ────────────────────────────
  if (expiredEnabled === "true") {
    const { start: todayStart, end: todayEnd } = manilaDayBoundaries();

    // Date-based: expired today
    const expiredToday = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        service: true,
        member: { include: { user: { select: { email: true } } } },
      },
    });

    // Session-based: used last session (sessionsUsed >= sessionsTotal) — filtered in DB
    const depletedIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Subscription"
      WHERE status = 'ACTIVE'
        AND "sessionsTotal" IS NOT NULL
        AND "sessionsUsed" >= "sessionsTotal"
    `;
    const depletedSessions = depletedIds.length === 0 ? [] : await prisma.subscription.findMany({
      where: { id: { in: depletedIds.map((r) => r.id) } },
      include: {
        service: true,
        member: { include: { user: { select: { email: true } } } },
      },
    });

    const allExpired = [...expiredToday, ...depletedSessions];

    // Deduplicate by subscription id
    const seen = new Set<string>();
    const uniqueExpired = allExpired.filter((sub) => {
      if (seen.has(sub.id)) return false;
      seen.add(sub.id);
      return true;
    });

    const expSubjectTpl = expiredSubjectTpl || DEFAULT_EXPIRED_SUBJECT;
    const expBodyTpl = expiredBodyTpl || DEFAULT_EXPIRED_BODY;

    const expiredTasks = uniqueExpired.map(async (sub) => {
      const email = sub.member?.user?.email;
      if (!email || !sub.member) return;
      const name = memberName(sub.member);
      const isSessionBased = sub.sessionsTotal !== null;
      const expiryReason = isSessionBased
        ? `you have used all ${sub.sessionsTotal} session${sub.sessionsTotal !== 1 ? "s" : ""} on your membership`
        : `your membership expired on ${sub.endDate!.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`;
      const expiryDate = sub.endDate
        ? sub.endDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : "";

      const vars = {
        member_name: name,
        service_name: sub.service.name,
        expiry_date: expiryDate,
        sessions_total: String(sub.sessionsTotal ?? ""),
        expiry_reason: expiryReason,
      };

      const subject = render(expSubjectTpl, vars);
      const bodyHtml = textToHtml(render(expBodyTpl, vars)) +
        `\n<hr/><p style="font-size:12px;color:#888;">Manage your account at <a href="${APP_URL}">${APP_URL}</a></p>`;

      await resend.emails.send({
        from: FROM,
        replyTo: "members@northsouth.com.ph",
        to: email,
        subject,
        html: bodyHtml,
      });
      results.push(`expired:${email}:${sub.service.name}`);
    });
    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < expiredTasks.length; i += 10) {
      await Promise.all(expiredTasks.slice(i, i + 10));
    }

    // Auto-expire date-based subscriptions whose endDate has passed
    await prisma.subscription.updateMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: new Date() },
        sessionsTotal: null,
      },
      data: { status: "EXPIRED" },
    });
  }

  // Unfreeze memberships whose freeze period has expired
  const frozenExpired = await prisma.subscription.findMany({
    where: { status: "PAUSED", frozenUntil: { lte: new Date() } },
    select: { id: true, memberId: true, frozenAt: true, frozenUntil: true, endDate: true },
  });

  if (frozenExpired.length > 0) {
    // Subscriptions with no endDate can be unfrozen in a single batch
    const noEndDate = frozenExpired.filter((s) => !s.endDate);
    const withEndDate = frozenExpired.filter((s) => !!s.endDate);

    if (noEndDate.length > 0) {
      await prisma.subscription.updateMany({
        where: { id: { in: noEndDate.map((s) => s.id) } },
        data: { status: "ACTIVE", frozenAt: null, frozenUntil: null },
      });
    }

    // Subscriptions with endDate need per-row endDate extension
    for (const sub of withEndDate) {
      const frozenDays = sub.frozenAt && sub.frozenUntil
        ? Math.ceil((sub.frozenUntil.getTime() - sub.frozenAt.getTime()) / 86400000)
        : 0;
      const newEndDate = new Date(sub.endDate!.getTime() + frozenDays * 86400000);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "ACTIVE", frozenAt: null, frozenUntil: null, endDate: newEndDate },
      });
    }

    // Batch-reactivate all affected members in a single query
    const memberIds = [...new Set(frozenExpired.map((s) => s.memberId).filter(Boolean))] as string[];
    if (memberIds.length > 0) {
      await prisma.member.updateMany({
        where: { id: { in: memberIds } },
        data: { status: "ACTIVE" },
      });
    }

    frozenExpired.forEach((sub) => results.push(`unfreeze:${sub.id}`));
  }

  return NextResponse.json({ ok: true, sent: results.length, results });
}
