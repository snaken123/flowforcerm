import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

// Marks a commission entry as paid out to the facilitator -- a record-keeping action
// only. The actual transfer happens outside this system (bank transfer, etc.); this is
// a ledger, not a payout engine, per the confirmed commission scope.
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await controlPlanePrisma.commissionEntry.update({
    where: { id: params.id },
    data: { paidOutAt: new Date() },
  });
  return NextResponse.json({ entry });
}
