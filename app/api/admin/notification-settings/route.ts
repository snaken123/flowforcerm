import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const KEYS = [
  "expiry_warning_enabled",
  "expiry_warning_days",
  "expired_notification_enabled",
  "expiry_warning_subject",
  "expiry_warning_body",
  "expired_notification_subject",
  "expired_notification_body",
];

export async function GET() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.systemSetting.findMany({ where: { key: { in: KEYS } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({
    expiryWarningEnabled: map["expiry_warning_enabled"] === "true",
    expiryWarningDays: parseInt(map["expiry_warning_days"] ?? "7", 10),
    expiredNotificationEnabled: map["expired_notification_enabled"] === "true",
    expiryWarningSubject: map["expiry_warning_subject"] ?? "",
    expiryWarningBody: map["expiry_warning_body"] ?? "",
    expiredNotificationSubject: map["expired_notification_subject"] ?? "",
    expiredNotificationBody: map["expired_notification_body"] ?? "",
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    expiryWarningEnabled, expiryWarningDays, expiredNotificationEnabled,
    expiryWarningSubject, expiryWarningBody,
    expiredNotificationSubject, expiredNotificationBody,
  } = await req.json();

  const upsert = (key: string, value: string) =>
    prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });

  await Promise.all([
    upsert("expiry_warning_enabled", String(!!expiryWarningEnabled)),
    upsert("expiry_warning_days", String(parseInt(expiryWarningDays, 10) || 7)),
    upsert("expired_notification_enabled", String(!!expiredNotificationEnabled)),
    ...(expiryWarningSubject !== undefined ? [upsert("expiry_warning_subject", expiryWarningSubject)] : []),
    ...(expiryWarningBody !== undefined ? [upsert("expiry_warning_body", expiryWarningBody)] : []),
    ...(expiredNotificationSubject !== undefined ? [upsert("expired_notification_subject", expiredNotificationSubject)] : []),
    ...(expiredNotificationBody !== undefined ? [upsert("expired_notification_body", expiredNotificationBody)] : []),
  ]);

  return NextResponse.json({ ok: true });
}
