import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["ACCESS", "CORRECTION", "DELETION", "OBJECTION", "DATA_PORTABILITY", "OTHER"]),
  details: z.string().max(1000).optional(),
});

// Any authenticated person (ADMIN, STAFF, MEMBER) can submit a request about
// their own data. KIOSK/STORE are shared device accounts, not individual
// people, so they're excluded.
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "MEMBER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const request = await prisma.privacyRequest.create({
    data: {
      requestedById: session.user.id,
      requestedByName: session.user.name ?? session.user.email ?? "Unknown",
      requestedByEmail: session.user.email ?? null,
      type: parsed.data.type,
      details: parsed.data.details,
    },
  });

  await logAudit({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "Unknown",
    action: "PRIVACY_REQUEST_CREATED",
    entityType: "PrivacyRequest",
    entityId: request.id,
    description: `Submitted a ${parsed.data.type} privacy request.${parsed.data.details ? ` Details: ${parsed.data.details}` : ""}`,
    metadata: { type: parsed.data.type },
  });

  return NextResponse.json(request, { status: 201 });
}

// ADMIN-only review queue listing.
export async function GET() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.privacyRequest.findMany({
    include: {
      requestedBy: { select: { role: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
