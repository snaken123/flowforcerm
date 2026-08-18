import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { controlPlanePrisma } from "./db";
import { getSuperAdminLoginLimiter } from "@/lib/rate-limit";

// A wholly separate NextAuth config from the tenant-side lib/auth.ts — own session
// cookie, own database (control-plane only), no PrismaAdapter (credentials-only,
// JWT strategy, no OAuth account linking needed for a single super-admin account type).
// This must never share state with tenant auth: a gym's own ADMIN role must never be
// able to reach anything here, and a super-admin session must never be valid on any
// tenant subdomain.
export const superAdminAuthOptions: NextAuthOptions = {
  secret: process.env.SUPERADMIN_NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: {
    signIn: "/superadmin/login",
    error: "/superadmin/login",
  },
  cookies: {
    sessionToken: {
      // The __Secure- prefix is browser-enforced HTTPS-only, so it can only be used
      // once this actually runs behind TLS (production) — matches NextAuth's own
      // dev/prod cookie-name convention.
      name: process.env.NODE_ENV === "production" ? "__Secure-superadmin-token" : "superadmin-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit by email — 5 attempts per 15 minutes. This is the single most
        // powerful account in the system, so brute-forcing it deserves the same
        // protection as tenant-side login.
        try {
          const limiter = getSuperAdminLoginLimiter();
          const { success } = await limiter.limit(credentials.email.toLowerCase());
          if (!success) return null;
        } catch {
          // If Redis is unavailable, fail open (don't lock admins out)
        }

        const superAdmin = await controlPlanePrisma.superAdmin.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!superAdmin) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, superAdmin.password);
        if (!passwordMatch) return null;

        return { id: superAdmin.id, email: superAdmin.email, name: superAdmin.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        (token as any).role = "SUPERADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = "SUPERADMIN";
      }
      return session;
    },
  },
};

export const getSuperAdminSession = () => getServerSession(superAdminAuthOptions);

export async function requireSuperAdmin() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
