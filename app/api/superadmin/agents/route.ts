import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

const createAgentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  bankCode: z.string().max(20).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(34).optional().or(z.literal("")),
  bankAccountHolderName: z.string().max(100).optional().or(z.literal("")),
});

export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await controlPlanePrisma.agent.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ agents });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createAgentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const agent = await controlPlanePrisma.agent.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      bankCode: parsed.data.bankCode || undefined,
      bankAccountNumber: parsed.data.bankAccountNumber || undefined,
      bankAccountHolderName: parsed.data.bankAccountHolderName || undefined,
    },
  });
  return NextResponse.json({ agent });
}
