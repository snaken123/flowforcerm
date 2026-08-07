import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { isValidTimeZone } from "@/lib/time";
import { sendSemaphoreSetupNotification } from "@/lib/email";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = z.object({
  gymName: z.string().min(1).max(100),
  slogan: z.string().max(120).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(HEX_COLOR, "Must be a hex color like #1a73e8").nullable().optional(),
  accentColor: z.string().regex(HEX_COLOR, "Must be a hex color like #1a73e8").nullable().optional(),
  emailFromName: z.string().max(100).nullable().optional(),
  smsSenderName: z.string().max(20).nullable().optional(),
  timezone: z.string().refine(isValidTimeZone, "Not a recognized timezone").optional(),
});

async function requireAdmin() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const branding = await prisma.tenantBranding.findFirst();
  return NextResponse.json({ branding });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = brandingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const previous = await prisma.tenantBranding.findFirst();

  const branding = await prisma.tenantBranding.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  // Best-effort: keeps middleware/messaging's denormalized cache in sync, but a
  // control-plane hiccup shouldn't block the tenant's own settings from saving.
  const tenantId = headers().get("x-tenant-id");
  if (tenantId) {
    await controlPlanePrisma.tenant
      .update({
        where: { id: tenantId },
        data: {
          brandName: branding.gymName,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          timezone: branding.timezone,
        },
      })
      .catch((err) => console.error("[branding] failed to sync control-plane cache", err));
  }

  // Semaphore requires each SMS sender name to be pre-approved in its own dashboard, and
  // the app has no way to verify/automate that — so whenever a gym sets or changes theirs,
  // log it (so the request is never silently lost) and notify the platform owner directly.
  if (tenantId && branding.smsSenderName && branding.smsSenderName !== previous?.smsSenderName) {
    await controlPlanePrisma.provisioningLog
      .create({
        data: {
          tenantId,
          step: "sms_sender_name_changed",
          status: "pending_manual_setup",
          detail: branding.smsSenderName,
        },
      })
      .catch((err) => console.error("[branding] failed to log sms sender change", err));

    try {
      await sendSemaphoreSetupNotification({
        gymName: branding.gymName,
        subdomain: headers().get("x-tenant-subdomain") ?? "",
        senderName: branding.smsSenderName,
      });
    } catch (err) {
      console.error("[branding] failed to send Semaphore setup notification", err);
    }
  }

  return NextResponse.json({ branding });
}
