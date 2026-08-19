import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["complete", "reject"]),
  resolutionNotes: z.string().max(1000).optional(),
});

// Marking a DELETION request "complete" does NOT itself delete anything --
// the admin still performs the actual deletion via the existing member-detail
// delete flow (app/api/members/[id]/route.ts DELETE) first; this is a paper
// trail recording that the request was reviewed and actioned, not a trigger.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const request = await prisma.privacyRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  const newStatus = parsed.data.action === "complete" ? "APPROVED" : "REJECTED";

  // Atomic claim: only succeeds if the request is still PENDING, so two
  // concurrent reviews of the same request can't both go through.
  const claim = await prisma.privacyRequest.updateMany({
    where: { id: params.id, status: "PENDING" },
    data: {
      status: newStatus,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      resolutionNotes: parsed.data.resolutionNotes,
    },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  const updated = await prisma.privacyRequest.findUniqueOrThrow({ where: { id: params.id } });

  await logAudit({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "Unknown",
    action: parsed.data.action === "complete" ? "PRIVACY_REQUEST_COMPLETED" : "PRIVACY_REQUEST_REJECTED",
    entityType: "PrivacyRequest",
    entityId: request.id,
    description: `${parsed.data.action === "complete" ? "Completed" : "Rejected"} a ${request.type} privacy request.${parsed.data.resolutionNotes ? ` Notes: ${parsed.data.resolutionNotes}` : ""}`,
    metadata: { type: request.type, action: parsed.data.action },
  });

  return NextResponse.json(updated);
}
