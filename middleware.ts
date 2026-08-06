import { NextRequest, NextResponse } from "next/server";

// DIAGNOSTIC step 4: everything inlined into this one file, zero imports of any
// other local file, to test whether the crash is specifically about middleware.ts
// importing ANY separate local module at all -- regardless of that module's own
// content -- since every previous variant that imported a local file crashed
// identically, while the one test with zero local imports (an empty middleware)
// was the only one that ever worked.

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function deriveEncryptionKey(secret: string, salt: string): Promise<CryptoKey> {
  const info = `NextAuth.js Generated Encryption Key${salt ? ` (${salt})` : ""}`;
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode(salt), info: new TextEncoder().encode(info) },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey("raw", derivedBits, "AES-GCM", false, ["decrypt"]);
}

async function getEdgeToken(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL;
  const cookieName = secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 5) return null;
    const [protectedHeaderB64, , ivB64, ciphertextB64, tagB64] = parts;
    const key = await deriveEncryptionKey(secret, "");
    const iv = base64UrlToUint8Array(ivB64);
    const ciphertextAndTag = concatBytes(base64UrlToUint8Array(ciphertextB64), base64UrlToUint8Array(tagB64));
    const additionalData = new TextEncoder().encode(protectedHeaderB64);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 } as AesGcmParams,
      key,
      ciphertextAndTag as BufferSource
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const token = await getEdgeToken(req);
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
