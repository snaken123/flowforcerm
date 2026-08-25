import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  bankCode: z.string().max(20).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(34).optional().or(z.literal("")),
  bankAccountHolderName: z.string().max(100).optional().or(z.literal("")),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { isActive, bankCode, bankAccountNumber, bankAccountHolderName } = parsed.data;
  const agent = await controlPlanePrisma.agent.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(bankCode !== undefined && { bankCode: bankCode || null }),
      ...(bankAccountNumber !== undefined && { bankAccountNumber: bankAccountNumber || null }),
      ...(bankAccountHolderName !== undefined && { bankAccountHolderName: bankAccountHolderName || null }),
    },
  });
  return NextResponse.json({ agent });
}
