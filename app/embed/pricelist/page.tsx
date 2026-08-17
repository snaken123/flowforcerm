import { prisma } from "@/lib/db";

export const revalidate = 300;
export const metadata = { title: "Membership Pricing — FlowForceRM" };

export default async function PricelistEmbedPage({ searchParams }: { searchParams: { packages?: string; order?: string } }) {
  const allowedPkgIds = searchParams.packages
    ? new Set(searchParams.packages.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
  const orderIds = searchParams.order
    ? searchParams.order.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      packages: {
        where: {
          isActive: true,
          ...(allowedPkgIds ? { id: { in: [...allowedPkgIds] } } : {}),
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const filtered = services.filter((s) => s.packages.length > 0);

  // Apply manual order if provided, otherwise sort tallest-first for masonry packing
  const withPackages = orderIds
    ? [...filtered].sort((a, b) => {
        const ai = orderIds.indexOf(a.id);
        const bi = orderIds.indexOf(b.id);
        const aPos = ai === -1 ? 9999 : ai;
        const bPos = bi === -1 ? 9999 : bi;
        return aPos - bPos;
      })
    : [...filtered].sort((a, b) => b.packages.length - a.packages.length);

  return (
    <>
      {/* dangerouslySetInnerHTML, not JSX text children -- React HTML-escapes quote
          characters in text children (even inside <style>), but <style> is a raw-text
          HTML element the browser never entity-decodes, so any escaped quote here
          (the @import url('...') and font-family: 'Inter' below both have one) made the
          server and client renders permanently disagree -- see the identical fix and
          longer explanation in app/embed/schedule/schedule-embed-client.tsx. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body, html {
          margin: 0; padding: 0;
          background: #f8f9fc;
          font-family: 'Inter', system-ui, sans-serif;
          color: #111827;
        }
        .ns-wrap { padding: 32px 16px 48px; }
        .ns-header { text-align: center; margin-bottom: 40px; }
        .ns-eyebrow {
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em;
          color: #6b7280; margin-bottom: 8px;
        }
        .ns-title { font-size: 28px; font-weight: 800; color: #111827; line-height: 1.2; }
        .ns-sub { font-size: 15px; color: #6b7280; margin-top: 8px; }
        .ns-grid {
          columns: 3 280px;
          column-gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .ns-card {
          break-inside: avoid;
          margin-bottom: 20px;
        }
        .ns-card {
          background: #fff; border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .ns-card-head {
          padding: 18px 20px 14px; border-bottom: 1px solid #f3f4f6;
          display: flex; align-items: center; gap: 12px;
        }
        .ns-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .ns-svc-name { font-size: 17px; font-weight: 700; color: #111827; }
        .ns-card-body { padding: 12px 20px 20px; flex: 1; }
        .ns-pkg {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid #f3f4f6;
        }
        .ns-pkg:last-child { border-bottom: none; }
        .ns-pkg-name { font-size: 14px; font-weight: 500; color: #374151; }
        .ns-pkg-meta { font-size: 12px; color: #9ca3af; margin-top: 2px; }
        .ns-pkg-price { font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; text-align: right; }
        .ns-pkg-nm { font-size: 11px; color: #9ca3af; text-align: right; margin-top: 2px; }
        .ns-footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af; }
        .ns-footer a { color: #6b7280; text-decoration: none; }
        @media (max-width: 480px) {
          .ns-title { font-size: 22px; }
          .ns-grid { columns: 1; }
        }
      ` }} />

      <div className="ns-wrap">
        <div className="ns-header">
          <p className="ns-eyebrow">FlowForceRM</p>
          <h1 className="ns-title">Membership Pricing</h1>
          <p className="ns-sub">Member prices listed · Contact us for more details</p>
        </div>

        <div className="ns-grid">
          {withPackages.map((service) => (
            <div className="ns-card" key={service.id}>
              <div className="ns-card-head">
                <span className="ns-dot" style={{ backgroundColor: service.color ?? "#6b7280" }} />
                <span className="ns-svc-name">{service.name}</span>
              </div>
              <div className="ns-card-body">
                {service.packages.map((pkg) => (
                  <div className="ns-pkg" key={pkg.id}>
                    <div>
                      <div className="ns-pkg-name">{pkg.name}</div>
                      <div className="ns-pkg-meta">
                        {pkg.sessions != null
                          ? `${pkg.sessions} session${pkg.sessions !== 1 ? "s" : ""}`
                          : "Unlimited"}
                        {" · "}
                        {pkg.validDays} day{pkg.validDays !== 1 ? "s" : ""} validity
                      </div>
                    </div>
                    <div>
                      {(() => {
                        const mp = pkg.memberPrice;
                        const nmp = pkg.nonMemberPrice;
                        const fmtPrice = (p: number) => p === 0 ? "FREE" : `₱${p.toLocaleString()}`;
                        if (mp !== null) {
                          return (
                            <>
                              <div className="ns-pkg-price">{fmtPrice(mp)}</div>
                              {nmp !== null && (
                                <div className="ns-pkg-nm">{fmtPrice(nmp)} non-member</div>
                              )}
                            </>
                          );
                        } else if (nmp !== null) {
                          return (
                            <>
                              <div className="ns-pkg-price">{fmtPrice(nmp)}</div>
                              <div className="ns-pkg-nm">(non-member)</div>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ns-footer">
          <p>Prices are subject to change without notice · <a href="https://flowforcerm.com" target="_blank" rel="noopener noreferrer">flowforcerm.com</a></p>
        </div>
      </div>
    </>
  );
}
