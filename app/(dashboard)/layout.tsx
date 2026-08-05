import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProgress } from "@/components/layout/nav-progress";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-7xl px-4 py-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
