import NextAuth from "next-auth";
import { superAdminAuthOptions } from "@/control-plane/lib/superadmin-auth";

const handler = NextAuth(superAdminAuthOptions);
export { handler as GET, handler as POST };
