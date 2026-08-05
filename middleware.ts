import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const host = req.headers.get("host") ?? "";

    const token = req.nextauth.token;

    // KIOSK role — always redirect to /kiosk
    if (token?.role === "KIOSK" && pathname !== "/kiosk") {
      return NextResponse.redirect(new URL("/kiosk", req.url));
    }

    // Block members who haven't completed onboarding
    if (token?.role === "MEMBER" && !(token as any)?.onboardingCompleted && pathname !== "/setup-account") {
      return NextResponse.redirect(new URL("/setup-account", req.url));
    }

    // Force staff/admin to set a new password on first login
    if (
      (token?.role === "STAFF" || token?.role === "ADMIN") &&
      (token as any)?.mustChangePassword &&
      pathname !== "/change-password"
    ) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    // Admin routes
    const staffAllowedAdminPaths = ["/admin/members", "/admin/schedule", "/admin/classes", "/admin/shop", "/admin/logs"];
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      const allowed =
        (token?.role === "STAFF" || token?.role === "STORE") &&
        staffAllowedAdminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
      if (!allowed) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Staff routes
    if (pathname.startsWith("/staff") && token?.role !== "STAFF" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const host = req.headers.get("host") ?? "";
        const { pathname } = req.nextUrl;
        // Allow kiosk subdomain root through — the rewrite above handles it,
        // and /kiosk page.tsx does its own auth check
        if (host.startsWith("kiosk.") && pathname === "/") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/member/:path*",
    "/dashboard/:path*",
    "/change-password",
    "/kiosk",
    "/",
    "/api/member/:path*",
    "/api/auth/2fa/:path*",
  ],
};
