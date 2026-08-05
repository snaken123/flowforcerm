"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const orientation = (screen as any).orientation;
    if (orientation?.lock) {
      orientation.lock("portrait").catch(() => {});
    }
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
