import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

// Read-only, any authenticated role (informational content, safe for members too).
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subprocessors = await controlPlanePrisma.subprocessor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ subprocessors });
}
