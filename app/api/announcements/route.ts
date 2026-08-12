import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  isPinned: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 10,
  });

  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned,
      createdById: (session.user as any).id,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(announcement, { status: 201 });
}
