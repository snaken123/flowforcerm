import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  addresses: z.array(z.string().email()).min(1, "At least one address must be selected"),
});

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.update({
    where: { userId },
    data: { emailFilterAddresses: parsed.data.addresses },
  });

  return NextResponse.json({ filterAddresses: integration.emailFilterAddresses });
}
