import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { isValidTimeZone } from "@/lib/time";

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

  return NextResponse.json({ branding });
}
