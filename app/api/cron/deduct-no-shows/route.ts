import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getPrismaClientForTenant } from "@/lib/db";
import { getActiveTenants } from "@/control-plane/lib/tenant-resolution";

// Runs the no-show deduction pass against one tenant's own database. Vercel Cron
// calls this route on the bare production domain, which never resolves a tenant
// subdomain (see middleware.ts's isRootDomainHost branch) -- so the shared,
// header-scoped `prisma` export from lib/db.ts has no tenant context to resolve
// and throws. Each tenant's client is obtained explicitly instead, the same
// pattern already used by the membership-notifications cron.
async function runForTenant(prisma: PrismaClient): Promise<{ processed: number; deducted: number; skipped: number }> {
  const now = new Date();

  // Find all CONFIRMED bookings where the scheduled class date has already passed
  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      scheduledDate: { lt: now },
    },
    include: {
      subscription: true,
    },
  });

  let deducted = 0;
  let skipped = 0;

  async function processBooking(booking: (typeof overdueBookings)[number]) {
    // Mark as NO_SHOW regardless of subscription type
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "NO_SHOW" },
    });

    // Deduct session only if subscription exists and is not unlimited
    if (booking.subscriptionId && booking.subscription && booking.subscription.sessionsTotal !== null) {
      const updated = await prisma.subscription.update({
        where: { id: booking.subscriptionId },
        data: { sessionsUsed: { increment: 1 } },
      });
      if (updated.sessionsUsed >= updated.sessionsTotal!) {
        await prisma.subscription.update({ where: { id: booking.subscriptionId }, data: { status: "EXPIRED" } });
      }
      deducted++;
    } else {
      skipped++;
    }
  }

  // Process in small batches instead of one booking at a time -- each booking is
  // independent, so this cuts wall-clock time roughly by the batch size with no
  // added risk.
  const BATCH_SIZE = 10;
  for (let i = 0; i < overdueBookings.length; i += BATCH_SIZE) {
    const batch = overdueBookings.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processBooking));
  }

  return { processed: overdueBookings.length, deducted, skipped };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await getActiveTenants();
  const byTenant: Record<string, { processed: number; deducted: number; skipped: number } | { error: string }> = {};

  for (const tenant of tenants) {
    try {
      const tenantPrisma = await getPrismaClientForTenant(tenant.id);
      byTenant[tenant.subdomain] = await runForTenant(tenantPrisma);
    } catch (e) {
      console.error(`[cron] deduct-no-shows failed for tenant ${tenant.subdomain}:`, e);
      byTenant[tenant.subdomain] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const totals = { processed: 0, deducted: 0, skipped: 0 };
  for (const r of Object.values(byTenant)) {
    if (!("error" in r)) {
      totals.processed += r.processed;
      totals.deducted += r.deducted;
      totals.skipped += r.skipped;
    }
  }

  return NextResponse.json({ ok: true, ...totals, byTenant });
}
