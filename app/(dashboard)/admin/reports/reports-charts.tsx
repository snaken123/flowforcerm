"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e", FROZEN: "#f59e0b", INACTIVE: "#94a3b8", CANCELLED: "#ef4444",
};

export function ReportsCharts({
  monthlyData,
  serviceData,
  statusData,
  checkInData,
}: {
  monthlyData: any[];
  serviceData: any[];
  statusData: any[];
  checkInData: any[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* New members per month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Members (6 months)</CardTitle>
          <CardDescription>Monthly sign-ups</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="newMembers" fill="#3b82f6" radius={[4, 4, 0, 0]} name="New Members" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Check-ins last 7 days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Check-ins (7 days)</CardTitle>
          <CardDescription>Attendance trend</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={checkInData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="checkIns" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Check-ins" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Members per service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Subscriptions by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="members" radius={[0, 4, 4, 0]} name="Members">
                {serviceData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Member status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
                {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {statusData.map((s) => (
              <div key={s.status} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
                <span className="capitalize">{s.status.toLowerCase()}</span>
                <span className="font-medium ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
