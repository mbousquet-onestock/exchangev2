/**
 * Decryption of the sensitive settings (onestock_token…) encrypted by the Extensions app.
 * Adapted from settings-secrets.mjs: `enc:v1:` + base64(iv 12 bytes | tag 16 bytes | ciphertext),
 * AES-256-GCM, key from SETTINGS_ENCRYPTION_KEY (same value as in the Extensions app).
 * A value without the `enc:v1:` prefix (legacy clear value) is returned as is.
 */
import { createDecipheriv, createHash } from "node:crypto";

const PREFIX = "enc:v1:";

/** Same derivation as the Extensions app: 64 hex chars, 32 bytes in base64, or a passphrase (SHA-256). */
function encryptionKey(raw = process.env.SETTINGS_ENCRYPTION_KEY): Buffer {
  const value = raw?.trim();
  if (!value) throw new Error("SETTINGS_ENCRYPTION_KEY is not set");
  if (/^[\da-f]{64}$/i.test(value)) return Buffer.from(value, "hex");
  const b64 = Buffer.from(value, "base64");
  if (b64.length === 32 && /^[A-Za-z0-9+/=_-]+$/.test(value)) return b64;
  return createHash("sha256").update(value).digest();
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function decryptSetting(value: string, key = process.env.SETTINGS_ENCRYPTION_KEY): string {
  if (!isEncrypted(value)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
