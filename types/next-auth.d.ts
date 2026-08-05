import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "ADMIN" | "STAFF" | "MEMBER" | "KIOSK" | "STORE";
      memberId?: string | null;
      employeeId?: string | null;
      employeeTypes: string[];
      taughtServiceIds: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "STAFF" | "MEMBER" | "KIOSK" | "STORE";
    memberId?: string | null;
    employeeId?: string | null;
    employeeTypes: string[];
    taughtServiceIds: string[];
  }
}
