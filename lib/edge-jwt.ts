import { jwtDecrypt } from "jose";
import hkdf from "@panva/hkdf";
import type { NextRequest } from "next/server";

// Manually decodes a next-auth v4 session cookie using jose + @panva/hkdf directly,
// replicating next-auth/jwt's own decode() algorithm exactly (dir/A256GCM JWE,
// HKDF-SHA256 key derivation with the same info string). This bypasses importing
// next-auth/jwt entirely, which crashes with "ReferenceError: __dirname is not
// defined" on Vercel's actual Edge Runtime -- confirmed via isolated diagnostic
// testing (an otherwise-empty middleware only crashes once getToken() is added).
// Root cause inside next-auth/jwt's own module graph wasn't fully pinned down;
// this sidesteps it while producing an identical decoded payload.

async function getDerivedEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return hkdf("sha256", secret, salt, `NextAuth.js Generated Encryption Key${salt ? ` (${salt})` : ""}`, 32);
}

export type EdgeToken = {
  id?: string;
  role?: string;
  mustChangePassword?: boolean;
  onboardingCompleted?: boolean;
  [key: string]: unknown;
};

export async function getEdgeToken(req: NextRequest): Promise<EdgeToken | null> {
  const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL;
  const cookieName = secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const encryptionSecret = await getDerivedEncryptionKey(secret, "");
    const { payload } = await jwtDecrypt(token, encryptionSecret, { clockTolerance: 15 });
    return payload as EdgeToken;
  } catch {
    return null;
  }
}
