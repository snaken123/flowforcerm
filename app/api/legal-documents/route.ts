import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getLegalDocuments } from "@/lib/legal-documents";

// Any authenticated role — read-only, backs onboarding + the member Documents tab.
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await getLegalDocuments();
  return NextResponse.json(documents);
}
