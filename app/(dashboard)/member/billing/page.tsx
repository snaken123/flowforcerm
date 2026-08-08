import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PaymentHistoryTable } from "./payment-history-table";

export const metadata = { title: "My Billing" };

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
            <PaymentHistoryTable payments={member.payments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
