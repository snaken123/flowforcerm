"use client";

import { SessionProvider } from "next-auth/react";

// Scoped to the /superadmin subtree only — points next-auth's client helpers
// (signIn/useSession/etc.) at the separate superadmin NextAuth route instead
// of the tenant-side /api/auth route the rest of the app uses.
export function SuperAdminProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/superadmin/api/auth">{children}</SessionProvider>;
}
