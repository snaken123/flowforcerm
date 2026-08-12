import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { dispatchAnnouncement } from "@/lib/announcement-dispatch";
import { z } from "zod";

const AUDIENCE_VALUES = ["ADMIN", "STAFF", "COACH", "MEMBER"] as const;

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  isPinned: z.boolean().optional().default(false),
  audience: z.array(z.enum(AUDIENCE_VALUES)).min(1),
  sendAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  sendEmail: z.boolean().optional().default(false),
  sendSms: z.boolean().optional().default(false),
});

function computeStatus(a: { sendAt: Date | null; expiresAt: Date | null }): "LIVE" | "SCHEDULED" | "EXPIRED" {
  const now = new Date();
  if (a.sendAt && a.sendAt > now) return "SCHEDULED";
  if (a.expiresAt && a.expiresAt <= now) return "EXPIRED";
  return "LIVE";
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const isManager = ["ADMIN", "STAFF"].includes(role); // coach-only employees carry role STAFF too

  const announcements = await prisma.announcement.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: isManager ? 30 : 10,
  });

  const now = new Date();
  const visible = isManager
    ? announcements
    : announcements.filter((a) => {
        const live = (!a.sendAt || a.sendAt <= now) && (!a.expiresAt || a.expiresAt > now);
        return live && a.audience.includes("MEMBER");
      });

  const withStatus = visible.map((a) => ({ ...a, status: computeStatus(a) }));

  return NextResponse.json(withStatus);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sendAt = parsed.data.sendAt ? new Date(parsed.data.sendAt) : null;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  const isDueNow = !sendAt || sendAt <= new Date();

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned,
      audience: parsed.data.audience,
      sendAt,
      expiresAt,
      sendEmail: parsed.data.sendEmail,
      sendSms: parsed.data.sendSms,
      createdById: (session.user as any).id,
      ...(isDueNow && (parsed.data.sendEmail || parsed.data.sendSms) ? { notifiedAt: new Date() } : {}),
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  // Awaited, not fire-and-forget: a serverless function's execution context can be torn
  // down as soon as the response is sent, which would silently kill an un-awaited send.
  if (isDueNow && (parsed.data.sendEmail || parsed.data.sendSms)) {
    try {
      await dispatchAnnouncement(announcement);
    } catch (e) {
      console.error("[announcements] immediate dispatch failed:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ ...announcement, status: computeStatus(announcement) }, { status: 201 });
}
