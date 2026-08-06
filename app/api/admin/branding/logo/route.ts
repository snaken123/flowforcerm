import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthSession } from "@/lib/auth";

const ALLOWED_TYPES = ["jpg", "jpeg", "png", "webp", "svg"];

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, svg." }, { status: 415 });
  }

  const fileName = `tenant-logo-${Date.now()}.${ext}`;
  const blob = await put(fileName, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
