import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { Prisma, Role } from "@prisma/client";
import { getLoginLimiter } from "./rate-limit";
import { getRequiredAgreementStatus } from "./legal-agreements";
import { getNeedsPaymentSetup } from "./billing-setup";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12h server-side max
  pages: {
    signIn: "/login",
    error: "/login",
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

        // Rate-limit by email — 5 attempts per 15 minutes
        try {
          const limiter = getLoginLimiter();
          const { success } = await limiter.limit(credentials.email.toLowerCase());
          if (!success) return null;
        } catch {
          // If Redis is unavailable, fail open (don't lock users out)
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
            console.error("[auth] tenant database is missing expected schema (table not found):", e.meta);
            return null;
          }
          throw e;
        }

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email!, name: user.name, role: user.role };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      // Kiosk session never expires
      if (token.role === "KIOSK") {
        token.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
      }

      // Force logout on a new deployment: stamp which deploy issued this token, and on
      // every later check (any request, not just sign-in) compare against the deploy
      // actually running now. A mismatch expires the token immediately so the user is
      // bounced to sign in and picks up whatever shipped -- without this, a JWT session
      // can keep running against stale client code/assumptions for its full 12h maxAge.
      // KIOSK is exempt (its session is already set to effectively never expire above);
      // devices aren't expected to be manually re-logged-in after every deploy.
      const currentDeployId = process.env.VERCEL_GIT_COMMIT_SHA;
      if (currentDeployId) {
        if (!token.deployId) {
          token.deployId = currentDeployId;
        } else if (token.deployId !== currentDeployId && token.role !== "KIOSK") {
          token.exp = Math.floor(Date.now() / 1000) - 1;
        }
      }

      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }
      // Only re-query DB on sign-in or within 60 seconds of token issuance (fresh login)
      const isNewToken = trigger === "signIn" || trigger === "update" ||
        (typeof token.iat === "number" && Date.now() / 1000 - token.iat < 60);
      if (token.id && isNewToken) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              role: true,
              mustChangePassword: true,
              member: { select: { onboardingCompletedAt: true, athleteIdAsHome: true } },
              employee: {
                select: {
                  id: true,
                  employeeTypes: true,
                  taughtServices: { select: { serviceId: true } },
                },
              },
            },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.role = dbUser.role;
            token.mustChangePassword = dbUser.mustChangePassword;
            token.onboardingCompleted = !!dbUser.member?.onboardingCompletedAt;
            token.athleteIdAsHome = dbUser.member?.athleteIdAsHome ?? true;
            token.employeeTypes = dbUser.employee?.employeeTypes ?? [];
            token.employeeId = dbUser.employee?.id ?? null;
            token.taughtServiceIds = dbUser.employee?.taughtServices.map((t) => t.serviceId) ?? [];

            // requiredTypesForRole() returns [] for MEMBER/KIOSK/STORE, so this is a
            // no-op (no DB queries) for the vast majority of sessions -- only ADMIN/STAFF
            // actually incur the control-plane + tenant lookups.
            try {
              const { allAccepted } = await getRequiredAgreementStatus({ id: token.id as string, role: dbUser.role });
              token.needsLegalAcceptance = !allAccepted;
            } catch (e) {
              console.error("[auth] legal agreement status check failed:", e);
              token.needsLegalAcceptance = false; // fail open -- never lock users out on an infra hiccup
            }

            // ADMIN-only -- a billed gym's admin can't proceed until payment details
            // are on file (see lib/billing-setup.ts, middleware.ts).
            if (dbUser.role === "ADMIN") {
              try {
                token.needsPaymentSetup = await getNeedsPaymentSetup();
              } catch (e) {
                console.error("[auth] payment setup status check failed:", e);
                token.needsPaymentSetup = false; // fail open -- never lock users out on an infra hiccup
              }
            } else {
              token.needsPaymentSetup = false;
            }
          }
        } catch (e) {
          console.error("[auth] JWT callback DB error:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
        session.user.name = token.name as string;
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
        (session.user as any).needsLegalAcceptance = token.needsLegalAcceptance ?? false;
        (session.user as any).needsPaymentSetup = token.needsPaymentSetup ?? false;
        (session.user as any).onboardingCompleted = token.onboardingCompleted ?? false;
        (session.user as any).athleteIdAsHome = token.athleteIdAsHome ?? true;
        (session.user as any).employeeTypes = (token.employeeTypes as string[]) ?? [];
        (session.user as any).employeeId = token.employeeId ?? null;
        (session.user as any).taughtServiceIds = (token.taughtServiceIds as string[]) ?? [];
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export async function requireRole(allowedRoles: Role[]) {
  const session = await getAuthSession();
  if (!session) throw new Error("Unauthorized");
  if (!allowedRoles.includes((session.user as any).role)) {
    throw new Error("Forbidden");
  }
  return session;
}
