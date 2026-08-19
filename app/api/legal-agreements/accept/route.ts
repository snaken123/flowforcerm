import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { acceptAgreements } from "@/lib/legal-agreements";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ documentIds: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { accepted } = await acceptAgreements(
    {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      role: session.user.role,
    },
    parsed.data.documentIds,
    {
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      // fallbackContext only applies when there's no prior acceptance of this
      // document TYPE at all (acceptAgreements upgrades to UPDATED_TERMS itself
      // when one exists) -- FIRST_LOGIN is accurate for this route either way,
      // since it's reached via the middleware login gate, not a signup form.
      fallbackContext: "FIRST_LOGIN",
    }
  );

  return NextResponse.json({ accepted });
}
