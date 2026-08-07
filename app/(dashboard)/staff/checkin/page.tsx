"use client";

import { useState, useRef, useEffect } from "react";
import { Search, CheckCircle, XCircle, Loader2, UserCheck, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, getInitials, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

export default function CheckInPage() {
  const timeZone = useTenantTimezone();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [forceConfirm, setForceConfirm] = useState<{ memberId: string; name: string; checkedInAt: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function search(q: string) {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function doCheckIn(memberId: string, name: string, force = false) {
    setCheckingIn(memberId);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, force }),
      });
      if (res.status === 409) {
        const data = await res.json();
        if (data.code === "already_checked_in_today") {
          setForceConfirm({ memberId, name, checkedInAt: data.checkedInAt });
          return;
        }
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Check-in failed");
      }
      setCheckedIn(memberId);
      toast({ title: `${name} checked in!`, description: "Check-in recorded successfully." });
      setTimeout(() => {
        setCheckedIn(null);
        setQuery("");
        setResults([]);
        inputRef.current?.focus();
      }, 2500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Check-in failed", description: err.message });
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <UserCheck className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Member Check-In</h1>
        <p className="text-muted-foreground">Search by name or email to check in a member</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Start typing a member's name..."
          className="pl-12 h-14 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((member) => {
            const isCheckedIn = checkedIn === member.id;
            const isLoading = checkingIn === member.id;
            const name = `${member.firstName} ${member.lastName}`;
            const isActive = member.status === "ACTIVE";

            return (
              <Card key={member.id} className={isCheckedIn ? "border-green-400 bg-green-50" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      <Badge variant={isActive ? "success" : "destructive"} className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.subscriptions?.map((s: any) => (
                        <span
                          key={s.id}
                          className="inline-flex text-xs rounded-full px-2 py-0.5 text-white"
                          style={{ backgroundColor: s.service?.color }}
                        >
                          {s.service?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isCheckedIn ? (
                    <CheckCircle className="h-7 w-7 text-green-500 shrink-0" />
                  ) : (
                    <Button
                      onClick={() => doCheckIn(member.id, name)}
                      disabled={!isActive || isLoading}
                      className="shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !isActive ? (
                        <XCircle className="h-4 w-4 mr-1" />
                      ) : null}
                      {!isActive ? "Inactive" : "Check In"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p>No members found for "{query}"</p>
        </div>
      )}

      <Dialog open={!!forceConfirm} onOpenChange={(o) => !o && setForceConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Already Checked In Today
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{forceConfirm?.name}</span> already checked
            in today at{" "}
            <span className="font-medium text-foreground">
              {forceConfirm?.checkedInAt
                ? new Date(forceConfirm.checkedInAt).toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone,
                  })
                : "—"}
            </span>
            . Check in again?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const { memberId, name } = forceConfirm!;
                setForceConfirm(null);
                doCheckIn(memberId, name, true);
              }}
            >
              Check In Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
