import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGmailClient } from "@/lib/gmail";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";

export async function GET() {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "NO_INTEGRATION" }, { status: 404 });

  // filterAddresses is independent DB data -- the frontend needs it whether or not the
  // Gmail alias fetch below succeeds, so it's read and returned unconditionally rather
  // than only on the success path.
  const filterAddresses = integration.emailFilterAddresses;

  try {
    const gmail = getGmailClient(integration.accessToken, integration.refreshToken ?? undefined);
    const res = await gmail.users.settings.sendAs.list({ userId: "me" });
    const aliases = (res.data.sendAs ?? []).map((a) => ({
      email: a.sendAsEmail ?? "",
      name: a.displayName ?? "",
      isPrimary: a.isPrimary ?? false,
    })).filter((a) => a.email);

    return NextResponse.json({ aliases, filterAddresses });
  } catch (err: any) {
    if (err?.code === 401 || err?.response?.status === 401) {
      return NextResponse.json({ error: "TOKEN_EXPIRED", filterAddresses }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch aliases", filterAddresses }, { status: 500 });
  }
}
