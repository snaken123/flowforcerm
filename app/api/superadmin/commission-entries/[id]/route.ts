import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { createXenditDisbursement } from "@/control-plane/lib/xendit-api";

const patchSchema = z.object({ action: z.enum(["mark_paid", "disburse"]) });

// "mark_paid" is pure record-keeping (paid by cash/bank transfer outside the platform).
// "disburse" actually moves money -- calls Xendit's disbursement API using the agent's
// bank details on file, and only marks paidOutAt once that call succeeds.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await controlPlanePrisma.commissionEntry.findUnique({
    where: { id: params.id },
    include: { agent: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.paidOutAt) return NextResponse.json({ error: "Already paid out" }, { status: 400 });

  if (parsed.data.action === "mark_paid") {
    const entry = await controlPlanePrisma.commissionEntry.update({
      where: { id: params.id },
      data: { paidOutAt: new Date() },
    });
    return NextResponse.json({ entry });
  }

  const { agent } = existing;
  if (!agent.bankCode || !agent.bankAccountNumber || !agent.bankAccountHolderName) {
    return NextResponse.json({ error: "This agent has no bank details on file." }, { status: 400 });
  }

  try {
    const disbursement = await createXenditDisbursement({
      externalId: existing.id,
      amountCentavos: existing.amountCentavos,
      bankCode: agent.bankCode,
      accountHolderName: agent.bankAccountHolderName,
      accountNumber: agent.bankAccountNumber,
      description: `FlowForceRM commission — ${existing.id}`,
    });
    const entry = await controlPlanePrisma.commissionEntry.update({
      where: { id: params.id },
      data: { paidOutAt: new Date(), xenditDisbursementId: disbursement.id },
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Disbursement failed." }, { status: 503 });
  }
}
