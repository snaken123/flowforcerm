import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

const ALLOWED_TYPES = ["jpg", "jpeg", "png", "webp"];

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = (formData.get("memberId") as string | null) ?? "unknown";
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp." }, { status: 415 });
  }

  const key = `records/${memberId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(key, buffer, file.type || "image/jpeg");
  } catch (err: unknown) {
    console.error("[upload/record-photo] R2 upload error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}
