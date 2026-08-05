"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, DollarSign, CheckSquare, Loader2, FileDown, Printer, Calendar } from "lucide-react";

const ReportsCharts = dynamic(
  () => import("./reports-charts").then((m) => ({ default: m.ReportsCharts })),
  { ssr: false }
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function downloadCSV(filename: string, rows: any[], label: string) {
  const headers = ["Member #", "Name", "Service", "Amount (₱)", "Method", "Date/Time"];
  const lines = [
    `${label}`,
    headers.join(","),
    ...rows.map((r) => [
      r.memberNumber, `"${r.memberName}"`, `"${r.service}"`,
      r.amount.toFixed(2), r.method, `"${fmtDate(r.paidAt)}"`,
    ].join(",")),
    "",
    `TOTAL,,,${rows.reduce((s, r) => s + r.amount, 0).toFixed(2)},,`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function printPDF(rows: any[], total: number, label: string) {
  const html = `
    <html><head><title>${label}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; }
      h2 { margin-bottom: 4px; } p { margin: 0 0 12px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 12px; border-bottom: 2px solid #e2e8f0; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
      tfoot td { font-weight: bold; background: #f8fafc; border-top: 2px solid #e2e8f0; }
      @media print { button { display: none; } }
    </style></head><body>
    <h2>NorthSouth Fight Sports</h2>
    <p>${label}</p>
    <table>
      <thead><tr><th>Member #</th><th>Name</th><th>Service</th><th>Method</th><th>Date/Time</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${r.memberNumber}</td><td>${r.memberName}</td><td>${r.service}</td>
          <td>${r.method}</td><td>${fmtDate(r.paidAt)}</td>
          <td style="text-align:right">${formatCurrencyPlain(r.amount)}</td>
        </tr>`).join("")}
      </tbody>
      <tfoot><tr><td colspan="5">Total</td><td style="text-align:right">${formatCurrencyPlain(total)}</td></tr></tfoot>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  const w = window.open("", "_blank"); w?.document.write(html); w?.document.close();
}

function formatCurrencyPlain(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// ─── Daily Revenue Card ───────────────────────────────────────────────────────

function DailyRevenueCard() {
  const [date, setDate] = useState(toDateStr(new Date()));
  const [data, setData] = useState<{ total: number; payments: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/revenue?type=daily&date=${d}`);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(date); }, [date, fetch_]);

  const label = `Daily Revenue — ${new Date(date + "T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground" /> Daily Revenue
            </CardTitle>
            {loading
              ? <div className="text-2xl font-bold text-muted-foreground animate-pulse">—</div>
              : <div className="text-2xl font-bold mt-1">{formatCurrencyPlain(data?.total ?? 0)}</div>
            }
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-8 w-40 text-xs" max={toDateStr(new Date())} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data?.payments.length ? (
          <p className="text-sm text-muted-foreground py-2">No payments recorded for this date.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 pr-3 font-medium">Member</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Service</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Method</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.payments.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 pr-3 font-medium">{r.memberName}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.service}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.method}</td>
                      <td className="py-1.5 text-right font-semibold">{formatCurrencyPlain(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => downloadCSV(`daily-revenue-${date}.csv`, data.payments, label)}>
                <FileDown className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => printPDF(data.payments, data.total, label)}>
                <Printer className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Monthly Revenue Card ─────────────────────────────────────────────────────

function MonthlyRevenueCard() {
  const now = new Date();
  const [month, setMonth] = useState(toMonthStr(now));
  const [data, setData] = useState<{ total: number; payments: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async (m: string) => {
    setLoading(true);
    const [y, mo] = m.split("-");
    const res = await fetch(`/api/admin/revenue?type=monthly&year=${y}&month=${parseInt(mo, 10)}`);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(month); }, [month, fetch_]);

  const [y, mo] = month.split("-");
  const label = `Monthly Revenue — ${new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly Revenue
            </CardTitle>
            {loading
              ? <div className="text-2xl font-bold text-muted-foreground animate-pulse">—</div>
              : <div className="text-2xl font-bold mt-1">{formatCurrencyPlain(data?.total ?? 0)}</div>
            }
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="h-8 w-36 text-xs" max={toMonthStr(new Date())} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data?.payments.length ? (
          <p className="text-sm text-muted-foreground py-2">No payments recorded for this month.</p>
        ) : (
          <>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 pr-3 font-medium">Date</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Member</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Service</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Method</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.payments.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{new Date(r.paidAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</td>
                      <td className="py-1.5 pr-3 font-medium">{r.memberName}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.service}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.method}</td>
                      <td className="py-1.5 text-right font-semibold">{formatCurrencyPlain(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => downloadCSV(`monthly-revenue-${month}.csv`, data.payments, label)}>
                <FileDown className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => printPDF(data.payments, data.total, label)}>
                <Printer className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ReportsClient({
  monthlyData, serviceData, statusData, checkInData, totalRevenue,
}: {
  monthlyData: any[]; serviceData: any[]; statusData: any[];
  checkInData: any[]; totalRevenue: number;
}) {
  const totalMembers = statusData.reduce((sum, s) => sum + s.count, 0);
  const activeMembers = statusData.find((s) => s.status === "ACTIVE")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Analytics and insights for your gym</p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">{activeMembers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyPlain(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <DailyRevenueCard />
        <MonthlyRevenueCard />
      </div>

      <ReportsCharts
        monthlyData={monthlyData}
        serviceData={serviceData}
        statusData={statusData}
        checkInData={checkInData}
      />
    </div>
  );
}
