import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

// Split off the members page's Resend suppression-list lookup so the page's
// main query doesn't wait on an external API call just to render a badge.
// The member table renders immediately with this list empty; the client
// fetches it here right after mount and fills in the "bounced" badges.
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ emails: [] });

  try {
    const res = await fetch("https://api.resend.com/suppressions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ emails: [] });
    const data = await res.json();
    const records: { email: string }[] = data.data ?? data.records ?? [];
    return NextResponse.json({ emails: records.map((r) => r.email.toLowerCase()) });
  } catch {
    return NextResponse.json({ emails: [] });
  }
}
