import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Augments NextAuth's built-in Session/JWT types with the custom fields set in the
// jwt/session callbacks in lib/auth.ts, so call sites can read session.user.role etc.
// without an `as any` cast on every access.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword: boolean;
      onboardingCompleted: boolean;
      athleteIdAsHome: boolean;
      employeeTypes: string[];
      employeeId: string | null;
      taughtServiceIds: string[];
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    mustChangePassword?: boolean;
    onboardingCompleted?: boolean;
    athleteIdAsHome?: boolean;
    employeeTypes?: string[];
    employeeId?: string | null;
    taughtServiceIds?: string[];
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }
}
