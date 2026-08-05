import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = { title: "My Billing" };

const PAYMENT_BADGE: Record<string, any> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "destructive",
  WAIVED: "secondary",
};

export default async function MemberBillingPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      subscriptions: {
        include: { service: true },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { subscription: { include: { service: true } } },
      },
    },
  });

  if (!member) redirect("/dashboard");

  const now = new Date();
  const activeSubs = member.subscriptions.filter((s) => {
    if (s.status !== "ACTIVE" && s.status !== "PAUSED") return false;
    if (s.sessionsTotal !== null && s.sessionsUsed >= s.sessionsTotal) return false;
    if (s.endDate && new Date(s.endDate) < now) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Billing</h1>

      {/* Active subscription summary */}
      {activeSubs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSubs.map((sub) => {
              const isFrozen = sub.status === "PAUSED";
              const isSessionBased = sub.sessionsTotal !== null;
              const sessionsLeft = isSessionBased ? (sub.sessionsTotal ?? 0) - sub.sessionsUsed : null;
              const daysLeft = !isSessionBased && sub.endDate
                ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / 86400000))
                : null;
              return (
                <div key={sub.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: sub.service.color }} />
                      <span className="font-medium text-sm">{sub.service.name}</span>
                    </div>
                    <Badge variant={isFrozen ? "warning" : "success"}>
                      {isFrozen ? "FROZEN" : "ACTIVE"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isSessionBased
                      ? `${sessionsLeft} session${sessionsLeft !== 1 ? "s" : ""} remaining of ${sub.sessionsTotal}`
                      : sub.endDate
                      ? `Expires ${formatDate(sub.endDate)}${daysLeft !== null ? ` · ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : ""}`
                      : "No expiry date"}
                  </p>
                  {isFrozen && sub.frozenUntil && (
                    <p className="text-xs text-blue-600">Frozen until {formatDate(sub.frozenUntil)}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {member.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payment history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Package</th>
                    <th className="text-left py-2 pr-4 font-medium">Sessions</th>
                    <th className="text-left py-2 pr-4 font-medium">Date</th>
                    <th className="text-left py-2 pr-4 font-medium">Method</th>
                    <th className="text-right py-2 pr-4 font-medium">Amount</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {member.payments.map((payment) => {
                    const sub = (payment as any).subscription;
                    const sessionsLabel = sub?.sessionsTotal != null
                      ? `${sub.sessionsTotal} sessions`
                      : "Unlimited";
                    return (
                      <tr key={payment.id} className="text-sm">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            {sub?.service?.color && (
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sub.service.color }} />
                            )}
                            <span className="font-medium">{sub?.service?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{sessionsLabel}</td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                          {formatDate((payment as any).paidAt ?? payment.createdAt)}
                        </td>
                        <td className="py-2.5 pr-4">
                          {(payment as any).method
                            ? <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium uppercase tracking-wide">{(payment as any).method}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-2.5">
                          <Badge variant={PAYMENT_BADGE[payment.status] ?? "secondary"} className="text-[10px]">
                            {payment.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
