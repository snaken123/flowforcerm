import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getRequiredAgreementStatus } from "@/lib/legal-agreements";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getRequiredAgreementStatus({
    id: session.user.id,
    role: session.user.role,
  });

  return NextResponse.json(status);
}
