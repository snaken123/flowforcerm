import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("memberId") as string | null;

  if (!file || !memberId) {
    return NextResponse.json({ error: "Missing file or memberId" }, { status: 400 });
  }

  // Members may only upload for their own record
  if (role === "MEMBER") {
    const { prisma } = await import("@/lib/db");
    const own = await prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } });
    if (!own || own.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const ALLOWED_TYPES = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, gif." }, { status: 415 });
  }
  const fileName = `member-${memberId}-${Date.now()}.${ext}`;

  const blob = await put(fileName, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
