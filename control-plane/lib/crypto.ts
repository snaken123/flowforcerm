import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const keyB64 = process.env.CONTROL_PLANE_KMS_KEY;
  if (!keyB64) throw new Error("CONTROL_PLANE_KMS_KEY is not set");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("CONTROL_PLANE_KMS_KEY must decode to exactly 32 bytes");
  return key;
}

// Encrypts a secret (e.g. a tenant's database connection string) for storage in the
// control-plane database. Output format: base64(iv):base64(authTag):base64(ciphertext).
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(encoded: string): string {
  const key = getKey();
  const [ivB64, tagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !tagB64 || !ciphertextB64) throw new Error("Malformed encrypted secret");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
