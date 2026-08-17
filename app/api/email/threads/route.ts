import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGmailClient, parseHeaders, parseEmailBody } from "@/lib/gmail";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";

export async function GET(req: NextRequest) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({ where: { userId } });

  if (!integration) {
    return NextResponse.json({ error: "NO_INTEGRATION" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const labelId = searchParams.get("label") ?? "INBOX";
  const maxResults = parseInt(searchParams.get("limit") ?? "25");
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    if (integration.provider === "gmail") {
      const gmail = getGmailClient(integration.accessToken, integration.refreshToken ?? undefined);

      const filterAddrs = integration.emailFilterAddresses;
      const isSent = labelId === "SENT";
      const q = filterAddrs.length > 0
        ? filterAddrs.map((a) => isSent ? `from:${a}` : `deliveredto:${a} OR to:${a}`).join(" OR ")
        : undefined;

      const threadsRes = await gmail.users.threads.list({
        userId: "me",
        labelIds: [labelId],
        maxResults,
        pageToken,
        ...(q ? { q } : {}),
      });

      const threads = threadsRes.data.threads ?? [];

      const detailed = await Promise.all(
        threads.map(async (t) => {
          const thread = await gmail.users.threads.get({ userId: "me", id: t.id!, format: "metadata" });
          const messages = thread.data.messages ?? [];
          const first = messages[0];
          const last = messages[messages.length - 1];

          const headers = parseHeaders((last?.payload?.headers ?? []).filter((h): h is { name: string; value: string } => h.name != null && h.value != null));
          const firstHeaders = parseHeaders((first?.payload?.headers ?? []).filter((h): h is { name: string; value: string } => h.name != null && h.value != null));

          return {
            id: t.id,
            subject: headers.subject || "(no subject)",
            from: firstHeaders.from,
            date: headers.date,
            snippet: last?.snippet ?? "",
            messageCount: messages.length,
            labelIds: last?.labelIds ?? [],
            unread: (last?.labelIds ?? []).includes("UNREAD"),
          };
        })
      );

      return NextResponse.json({
        threads: detailed,
        nextPageToken: threadsRes.data.nextPageToken,
        provider: "gmail",
        connectedEmail: integration.email,
      });
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  } catch (err: any) {
    console.error("Email fetch error:", err);
    if (err?.code === 401 || err?.response?.status === 401) {
      return NextResponse.json({ error: "TOKEN_EXPIRED" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
