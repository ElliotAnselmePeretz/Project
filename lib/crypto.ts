import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets we must store and later replay (the ManageBac feed
 * URL). Hashing is not an option — we need the original value back to fetch it.
 */
/**
 * A fixed, publicly-known key used only when ENCRYPTION_KEY is unset in
 * development, so `git clone && npm run dev` works with no configuration.
 * It protects nothing — that is the point: it must never be used in
 * production, and the check below refuses to.
 */
const DEV_FALLBACK_KEY = Buffer.alloc(32, 7).toString("base64");

function key(): Buffer {
  let raw = process.env.ENCRYPTION_KEY;
  if (!raw && process.env.NODE_ENV !== "production") raw = DEV_FALLBACK_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set — see .env.example");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes base64 (openssl rand -base64 32)");
  }
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}
