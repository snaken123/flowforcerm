import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Called by Vercel Cron every 5 minutes to keep Neon and the serverless function warm.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true });
}
