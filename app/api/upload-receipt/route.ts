import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

function buildFileName(params: {
  date: string;
  lastName: string;
  sport: string;
  package: string;
  amount: number;
  paymentMethod: string;
  ext: string;
}): string {
  const d = new Date(params.date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dateStr = `${mm}${dd}${yyyy}`;

  const clean = (s: string) =>
    s.replace(/[^a-zA-Z0-9]/g, "").replace(/\s+/g, "");

  const lastName = clean(params.lastName);
  const sport = clean(params.sport);
  const pkg = clean(params.package);
  const amount = `Php${Math.round(params.amount)}`;
  const payment = clean(params.paymentMethod);

  return `receipts/${dateStr}_${lastName}_${sport}_${pkg}_${amount}_${payment}.${params.ext}`;
}

const ALLOWED_RECEIPT_TYPES = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("memberId") as string | null;
  const sport = formData.get("sport") as string;
  const pkg = formData.get("package") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = formData.get("paymentMethod") as string;

  // Look up lastName server-side so it's always accurate
  let lastName = (formData.get("lastName") as string) || "";
  if (!lastName && memberId) {
    const m = await prisma.member.findUnique({ where: { id: memberId }, select: { lastName: true } });
    lastName = m?.lastName ?? "";
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_RECEIPT_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, gif, pdf." }, { status: 415 });
  }
  const mimeType = file.type || "image/jpeg";
  const key = buildFileName({
    date: new Date().toISOString(),
    lastName,
    sport,
    package: pkg,
    amount,
    paymentMethod,
    ext,
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  console.log("[upload-receipt] uploading file:", key, "size:", buffer.length);
  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(key, buffer, mimeType);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-receipt] R2 upload error:", msg);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  console.log("[upload-receipt] success:", key);
  return NextResponse.json({
    id: key,
    name: key.split("/").pop(),
    link: publicUrl,
    imageUrl: publicUrl,
  });
}
