"use client";

import { createContext, useContext } from "react";

// Client-side counterpart to lib/tenant-context.ts's getTenantTimezone() — that one
// reads the x-tenant-timezone request header via next/headers, which only works in
// Server Components/Route Handlers. Client Components (date pickers, local formatting
// in dialogs, etc.) get the same value through this context instead, populated once by
// a server-rendered ancestor (see app/(dashboard)/layout.tsx) so no client component
// needs its own data fetch just to know the tenant's timezone.
const TenantTimezoneContext = createContext<string>("Asia/Manila");

export function TenantTimezoneProvider({ timezone, children }: { timezone: string; children: React.ReactNode }) {
  return <TenantTimezoneContext.Provider value={timezone}>{children}</TenantTimezoneContext.Provider>;
}

export function useTenantTimezone(): string {
  return useContext(TenantTimezoneContext);
}
