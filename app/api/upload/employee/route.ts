import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const employeeId = formData.get("employeeId") as string | null;

  if (!file || !employeeId) {
    return NextResponse.json({ error: "Missing file or employeeId" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const ALLOWED_TYPES = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, gif." }, { status: 415 });
  }
  const fileName = `employee-${employeeId}-${Date.now()}.${ext}`;

  const blob = await put(fileName, file, { access: "public" });

  await prisma.employee.update({
    where: { id: employeeId },
    data: { photoUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}
