import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getPrismaClientForTenant } from "@/lib/db";
import { getActiveTenants } from "@/control-plane/lib/tenant-resolution";
import { dispatchAnnouncement } from "@/lib/announcement-dispatch";

// Picks up announcements whose scheduled send time has arrived and haven't been
// notified yet (immediate ones are dispatched synchronously in POST /api/announcements
// and stamp notifiedAt right away, so this only ever finds future-scheduled ones).
//
// Vercel Cron calls this route on the bare production domain, which never resolves a
// tenant subdomain (see middleware.ts's isRootDomainHost branch) -- so each tenant's
// client is obtained explicitly instead of relying on the request-header-scoped
// `prisma` export, and is passed through to dispatchAnnouncement() so its own DB
// lookups (recipient resolution) stay scoped to the same tenant too.
async function runForTenant(prisma: PrismaClient): Promise<{ processed: number; dispatched: number }> {
  const due = await prisma.announcement.findMany({
    where: {
      notifiedAt: null,
      sendAt: { lte: new Date() },
      OR: [{ sendEmail: true }, { sendSms: true }],
    },
  });

  let dispatched = 0;
  for (const a of due) {
    try {
      await dispatchAnnouncement(a, prisma);
      await prisma.announcement.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
      dispatched++;
    } catch (e) {
      console.error(`[cron/dispatch-announcements] failed for announcement ${a.id}:`, e instanceof Error ? e.message : e);
    }
  }

  return { processed: due.length, dispatched };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await getActiveTenants();
  const byTenant: Record<string, { processed: number; dispatched: number } | { error: string }> = {};

  for (const tenant of tenants) {
    try {
      const tenantPrisma = await getPrismaClientForTenant(tenant.id);
      byTenant[tenant.subdomain] = await runForTenant(tenantPrisma);
    } catch (e) {
      console.error(`[cron] dispatch-announcements failed for tenant ${tenant.subdomain}:`, e);
      byTenant[tenant.subdomain] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const totals = { processed: 0, dispatched: 0 };
  for (const r of Object.values(byTenant)) {
    if (!("error" in r)) {
      totals.processed += r.processed;
      totals.dispatched += r.dispatched;
    }
  }

  return NextResponse.json({ ok: true, ...totals, byTenant });
}
