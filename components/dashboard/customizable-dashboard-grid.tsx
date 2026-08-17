"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Users, UserCheck, TrendingUp, AlertCircle, LayoutGrid, Check, RotateCcw, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, timeAgo } from "@/lib/utils";
import { TodaysWodCard } from "@/components/dashboard/todays-wod-card";
import { AnnouncementBoardCard } from "@/components/dashboard/announcement-board-card";
import { LogbookCard } from "@/components/dashboard/logbook-card";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { DEFAULT_LAYOUT, CARD_LABELS, loadDashboardLayout, saveDashboardLayout, type CardId, type CardLayoutItem } from "@/lib/dashboard-layout";

export function CustomizableDashboardGrid({
  stats,
  recentCheckins,
  expiringSubscriptions,
  recentMembers,
  disabledCards = [],
}: {
  stats: { totalMembers: number; activeMembers: number; todayCheckins: number; newThisMonth: number; overduePayments: number };
  recentCheckins: any[];
  expiringSubscriptions: any[];
  recentMembers: any[];
  // Cards hidden by a tenant-level feature flag being off -- unlike a personally-hidden
  // card, these never show in the "Hidden" restore tray, since the gym doesn't have
  // access to them at all, not just chosen not to see them.
  disabledCards?: CardId[];
}) {
  const [layout, setLayout] = useState<CardLayoutItem[]>(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);

  // Loaded after hydration -- localStorage is unavailable during SSR.
  useEffect(() => {
    setLayout(loadDashboardLayout());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateLayout(next: CardLayoutItem[]) {
    setLayout(next);
    saveDashboardLayout(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.findIndex((c) => c.id === active.id);
    const newIndex = layout.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    updateLayout(arrayMove(layout, oldIndex, newIndex));
  }

  function toggleWidth(id: CardId) {
    const next: Record<number, 1 | 2 | 3 | 4> = { 1: 2, 2: 3, 3: 4, 4: 1 };
    updateLayout(layout.map((c) => (c.id === id ? { ...c, width: next[c.width] } : c)));
  }

  function removeCard(id: CardId) {
    updateLayout(layout.map((c) => (c.id === id ? { ...c, hidden: true } : c)));
  }

  function restoreCard(id: CardId) {
    updateLayout(layout.map((c) => (c.id === id ? { ...c, hidden: false } : c)));
  }

  function resetLayout() {
    updateLayout(DEFAULT_LAYOUT);
  }

  function renderCardContent(id: CardId) {
    switch (id) {
      case "wod":
        return <TodaysWodCard showPlanLink={true} />;
      case "announcements":
        return <AnnouncementBoardCard canManage={true} />;
      case "stat-total-members":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">{stats.activeMembers} active</p>
            </CardContent>
          </Card>
        );
      case "stat-today-checkins":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayCheckins}</div>
              <p className="text-xs text-muted-foreground">so far today</p>
            </CardContent>
          </Card>
        );
      case "stat-new-month":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newThisMonth}</div>
              <p className="text-xs text-muted-foreground">new members</p>
            </CardContent>
          </Card>
        );
      case "stat-overdue-payments":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">need attention</p>
            </CardContent>
          </Card>
        );
      case "recent-checkins":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Check-ins</CardTitle>
              <CardDescription>Members who checked in recently</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentCheckins.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(c.member.firstName?.[0] ?? "?") + (c.member.lastName?.[0] ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.member.firstName} {c.member.lastName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(c.checkedInAt)}</span>
                  </li>
                ))}
                {recentCheckins.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No check-ins today</p>
                )}
              </ul>
            </CardContent>
          </Card>
        );
      case "newest-members":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Newest Members</CardTitle>
              <CardDescription>Recently joined members</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentMembers.map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                      {m.firstName[0]}{m.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.subscriptions.map((s: any) => s.service.name).join(", ") || "No subscriptions"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(m.joinDate)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      case "expiring-soon":
        if (expiringSubscriptions.length === 0) return null;
        return (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                Expiring Soon
              </CardTitle>
              <CardDescription>Subscriptions expiring in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {expiringSubscriptions.map((sub: any) => (
                  <li key={sub.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sub.member.firstName} {sub.member.lastName}</span>
                    <span className="text-muted-foreground">{sub.service.name}</span>
                    <Badge variant="warning">Expires {formatDate(sub.endDate)}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      case "logbook":
        return <LogbookCard />;
      default:
        return null;
    }
  }

  const notDisabled = (c: CardLayoutItem) => !disabledCards.includes(c.id);
  const visible = layout.filter((c) => notDisabled(c) && (c.id === "expiring-soon" ? c.hidden === false && expiringSubscriptions.length > 0 : !c.hidden));
  const hidden = layout.filter((c) => notDisabled(c) && c.hidden && !(c.id === "expiring-soon" && expiringSubscriptions.length === 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {editMode && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetLayout}>
            <RotateCcw className="h-3 w-3 mr-1" />Reset Layout
          </Button>
        )}
        <Button size="sm" variant={editMode ? "default" : "outline"} className="h-7 text-xs" onClick={() => setEditMode((v) => !v)}>
          {editMode ? <><Check className="h-3 w-3 mr-1" />Done</> : <><LayoutGrid className="h-3 w-3 mr-1" />Edit Layout</>}
        </Button>
      </div>

      {editMode && hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <span className="text-xs text-muted-foreground shrink-0">Hidden:</span>
          {hidden.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => restoreCard(c.id)}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3" />{CARD_LABELS[c.id]}
            </button>
          ))}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {visible.map((c) => {
              const content = renderCardContent(c.id);
              if (!content) return null;
              return (
                <DashboardCardShell
                  key={c.id}
                  id={c.id}
                  width={c.width}
                  editMode={editMode}
                  onToggleWidth={() => toggleWidth(c.id)}
                  onRemove={() => removeCard(c.id)}
                >
                  {content}
                </DashboardCardShell>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
