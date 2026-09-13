import type { PrismaClient } from "@prisma/client";
import { prisma as ambientPrisma } from "@/lib/db";
import { getResend, resolveEmailFrom } from "@/lib/email";
import { sendBulkSMS } from "@/lib/sms";
import { resolveAnnouncementRecipients } from "@/lib/announcement-recipients";

export type AnnouncementDispatchResult = {
  emailSent?: number;
  emailFailed?: number;
  smsSent?: number;
  smsFailed?: number;
};

// Shared by the immediate-send path (POST /api/announcements, when sendAt is blank/past)
// and the dispatch-announcements cron (for future-scheduled ones). Best-effort: a failed
// batch doesn't throw, since the announcement itself is already posted either way -- this
// only concerns the optional email/SMS echo of it. The counts below are the only record of
// whether that echo actually worked -- callers persist them onto the Announcement row so
// "was this actually sent" is answerable later without digging through logs.
//
// `prisma` defaults to the ambient, header-scoped client so the immediate-send path
// (a normal tenant-resolved request) needs no change. The cron path has no request
// header to resolve a tenant from and passes its own per-tenant client explicitly.
export async function dispatchAnnouncement(
  announcement: {
    title: string;
    content: string;
    audience: string[];
    sendEmail: boolean;
    sendSms: boolean;
  },
  prisma: PrismaClient = ambientPrisma
): Promise<AnnouncementDispatchResult> {
  if (!announcement.sendEmail && !announcement.sendSms) return {};

  const { email: emailRecipients, sms: smsRecipients } = await resolveAnnouncementRecipients(announcement.audience, prisma);
  const result: AnnouncementDispatchResult = {};

  if (announcement.sendEmail) {
    result.emailSent = 0;
    result.emailFailed = 0;
    const from = await resolveEmailFrom();
    for (let i = 0; i < emailRecipients.length; i += 50) {
      const batch = emailRecipients.slice(i, i + 50);
      try {
        const sendResult = await getResend().batch.send(batch.map((r) => ({
          from,
          to: r.email!,
          subject: announcement.title,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
              <div style="margin-bottom:24px"><strong style="font-size:16px">FlowForceRM</strong></div>
              <h2 style="margin-bottom:8px">${announcement.title}</h2>
              <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#333">${announcement.content.replace(/\n/g, "<br/>")}</div>
            </div>
          `,
        })));
        if (sendResult.error) {
          console.error("[announcement-dispatch] email batch error:", sendResult.error);
          result.emailFailed += batch.length;
        } else {
          result.emailSent += batch.length;
        }
      } catch (e) {
        console.error("[announcement-dispatch] email batch exception:", e instanceof Error ? e.message : e);
        result.emailFailed += batch.length;
      }
    }
  }

  if (announcement.sendSms) {
    if (smsRecipients.length > 0) {
      try {
        const { sent, failed } = await sendBulkSMS(
          smsRecipients.map((r) => ({ phone: r.phone!, name: r.name })),
          `${announcement.title}: ${announcement.content}`
        );
        result.smsSent = sent;
        result.smsFailed = failed;
      } catch (e) {
        console.error("[announcement-dispatch] sms exception:", e instanceof Error ? e.message : e);
        result.smsSent = 0;
        result.smsFailed = smsRecipients.length;
      }
    } else {
      result.smsSent = 0;
      result.smsFailed = 0;
    }
  }

  return result;
}
