import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGmailClient } from "@/lib/gmail";
import { z } from "zod";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  inReplyTo: z.string().optional(),
  threadId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "NO_INTEGRATION" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { to, subject, body: emailBody, inReplyTo, threadId } = parsed.data;

  try {
    const gmail = getGmailClient(integration.accessToken, integration.refreshToken ?? undefined);

    const headers = [
      `From: ${integration.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
    ].join("\r\n");

    const rawMessage = `${headers}\r\n\r\n${emailBody}`;
    const encoded = Buffer.from(rawMessage).toString("base64url");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encoded,
        ...(threadId ? { threadId } : {}),
      },
    });

    return NextResponse.json({ id: result.data.id, threadId: result.data.threadId });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
