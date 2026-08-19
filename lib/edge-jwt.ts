import type { NextRequest } from "next/server";

// Manually decodes a next-auth v4 session cookie using ONLY native Web Crypto
// (crypto.subtle), replicating next-auth/jwt's exact algorithm (dir/A256GCM JWE,
// HKDF-SHA256 key derivation with next-auth's fixed info string) without any
// external crypto library. Both next-auth/jwt's own getToken() and a jose-based
// reimplementation crash/fail to build on Vercel's Edge Runtime -- getToken with
// a module-load-time "__dirname is not defined" ReferenceError, and jose because
// its JWE decrypt path imports a deflate helper referencing CompressionStream/
// DecompressionStream, which Next.js's edge-compatibility checker rejects at
// deploy time even though it's never exercised (our tokens don't use "zip").
// crypto.subtle is a Web-standard global with no import graph to trip over.

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
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey("raw", derivedBits, "AES-GCM", false, ["decrypt"]);
}

// Decrypts a next-auth v4 compact JWE (alg: "dir", enc: "A256GCM") using AES-GCM
// directly. Per the JWE spec, for "dir" the derived key IS the content encryption
// key (no key-wrapping segment), and the ASCII bytes of the encoded protected
// header are the AES-GCM "additional authenticated data".
async function decryptJwe(token: string, secret: string, salt: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [protectedHeaderB64, , ivB64, ciphertextB64, tagB64] = parts;

  const key = await deriveEncryptionKey(secret, salt);
  const iv = base64UrlToUint8Array(ivB64);
  const ciphertextAndTag = concatBytes(base64UrlToUint8Array(ciphertextB64), base64UrlToUint8Array(tagB64));
  const additionalData = new TextEncoder().encode(protectedHeaderB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 } as AesGcmParams,
    key,
    ciphertextAndTag as BufferSource
  );

  const json = new TextDecoder().decode(plaintext);
  return JSON.parse(json);
}

export type EdgeToken = {
  id?: string;
  role?: string;
  mustChangePassword?: boolean;
  needsLegalAcceptance?: boolean;
  onboardingCompleted?: boolean;
  exp?: number;
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
    const payload = await decryptJwe(token, secret, "");
    if (!payload) return null;
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000 - 15) return null; // matches getToken's 15s clockTolerance
    return payload as EdgeToken;
  } catch {
    return null;
  }
}
