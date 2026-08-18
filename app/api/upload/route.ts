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

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  // File extension is just a name -- verify the actual bytes match a real image format
  // (magic numbers) so a renamed non-image file can't slip through.
  const buffer = Buffer.from(await file.arrayBuffer());
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = buffer.subarray(0, 4).toString("ascii") === "GIF8";
  const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isGif && !isWebp) {
    return NextResponse.json({ error: "File content does not match an allowed image type." }, { status: 415 });
  }

  const fileName = `member-${memberId}-${Date.now()}.${ext}`;

  const blob = await put(fileName, buffer, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
