// Plain constants, no server-only imports -- unlike lib/email.ts (which pulls in
// next/headers transitively via tenant-context and so can't be imported from a
// "use client" file), this is safe to import from both server routes and client pages.
export const MEMBERS_EMAIL = "members@flowforcerm.com";
