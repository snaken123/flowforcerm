import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

const ALLOWED_TYPES = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];

// Upload a receipt for a flagged payment — clears needsReceipt and sets receiptUrl.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, gif, pdf." }, { status: 415 });
  }

  const key = `receipts/payment-${params.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(key, buffer, file.type || "image/jpeg");
  } catch (err: unknown) {
    console.error("[payments/receipt] R2 upload error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const payment = await prisma.payment.update({
    where: { id: params.id },
    data: { receiptUrl: publicUrl, needsReceipt: false },
  });

  return NextResponse.json(payment);
}

// Mark "no receipt needed" — clears the flag without a file.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.needsReceipt !== false) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const payment = await prisma.payment.update({
    where: { id: params.id },
    data: { needsReceipt: false },
  });

  return NextResponse.json(payment);
}
