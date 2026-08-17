import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGmailClient, parseHeaders, parseEmailBody } from "@/lib/gmail";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "NO_INTEGRATION" }, { status: 404 });

  try {
    const gmail = getGmailClient(integration.accessToken, integration.refreshToken ?? undefined);

    const thread = await gmail.users.threads.get({
      userId: "me",
      id: params.id,
      format: "full",
    });

    const messages = (thread.data.messages ?? []).map((msg) => {
      const headers = parseHeaders((msg.payload?.headers ?? []) as Array<{ name: string; value: string }>);
      const { html, text } = parseEmailBody(msg.payload);
      return {
        id: msg.id,
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        date: headers.date,
        html,
        body: text,
        snippet: msg.snippet,
        labelIds: msg.labelIds,
        unread: (msg.labelIds ?? []).includes("UNREAD"),
      };
    });

    // Mark thread as read
    await gmail.users.threads.modify({
      userId: "me",
      id: params.id,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });

    return NextResponse.json({ id: params.id, messages });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}
