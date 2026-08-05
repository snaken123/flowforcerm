import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { google } from "googleapis";
import { Readable } from "stream";

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

  return `${dateStr}_${lastName}_${sport}_${pkg}_${amount}_${payment}.${params.ext}`;
}

const ALLOWED_RECEIPT_TYPES = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  console.log("[upload-receipt] folderId:", folderId ? "SET" : "MISSING");
  console.log("[upload-receipt] serviceEmail:", serviceEmail ? serviceEmail : "MISSING");
  console.log("[upload-receipt] serviceKey:", serviceKey ? `SET (${serviceKey.slice(0, 40)}...)` : "MISSING");

  if (!folderId || !serviceEmail || !serviceKey) {
    return NextResponse.json({ error: "Google Drive not configured.", missing: { folderId: !folderId, serviceEmail: !serviceEmail, serviceKey: !serviceKey } }, { status: 503 });
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
  const fileName = buildFileName({
    date: new Date().toISOString(),
    lastName,
    sport,
    package: pkg,
    amount,
    paymentMethod,
    ext,
  });

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: serviceKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = Readable.from(buffer);

  console.log("[upload-receipt] uploading file:", fileName, "size:", buffer.length);
  let response;
  try {
    response = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id,name,webViewLink",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-receipt] Drive API error:", msg);
    return NextResponse.json({ error: "Drive upload failed" }, { status: 500 });
  }

  console.log("[upload-receipt] success:", response.data.id, response.data.name);
  const fileId = response.data.id!;
  return NextResponse.json({
    id: fileId,
    name: response.data.name,
    link: response.data.webViewLink,
    imageUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
  });
}
