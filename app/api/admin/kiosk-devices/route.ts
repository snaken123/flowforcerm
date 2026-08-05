import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { randomUUID } from "crypto";
import { z } from "zod";

async function requireAdmin() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const devices = await (prisma as any).kioskDevice.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  });
  return NextResponse.json(devices);
}

const createSchema = z.object({ label: z.string().min(1).max(80) });

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Label is required." }, { status: 400 });

  const token = randomUUID();
  const device = await (prisma as any).kioskDevice.create({
    data: { token, label: parsed.data.label },
    select: { id: true, label: true, createdAt: true },
  });

  // Return token in this response only — never exposed again
  return NextResponse.json({ ...device, token }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await (prisma as any).kioskDevice.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
