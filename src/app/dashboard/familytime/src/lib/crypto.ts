// src/lib/crypto.ts
// ─────────────────────────────────────────────────────────────
// App-layer AES-256-GCM encryption for sensitive fields.
// Used for: account numbers, usernames, passwords, PINs.
//
// NEVER import this in client components.
// Only use in API routes (server-side).
// ─────────────────────────────────────────────────────────────

import crypto from "crypto";

const ALGORITHM  = "aes-256-gcm";
const IV_LENGTH  = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.SUPABASE_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing SUPABASE_ENCRYPTION_KEY");
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a plain text string.
 * Returns a base64 string containing iv + tag + ciphertext
 */
export function encryptField(plainText: string | null | undefined): string | null {
  if (!plainText) return null;
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a previously encrypted string.
 * Returns the original plain text.
 */
export function decryptField(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    const key    = getKey();
    const buf    = Buffer.from(encrypted, "base64");
    const iv     = buf.subarray(0, IV_LENGTH);
    const tag    = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const cipher = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    return decipher.update(cipher).toString("utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypt an object of credential fields.
 */
export function encryptCredentials(creds: {
  account_number?: string | null;
  username?:       string | null;
  password?:       string | null;
  pin?:            string | null;
}) {
  return {
    account_number: encryptField(creds.account_number),
    username:       encryptField(creds.username),
    password:       encryptField(creds.password),
    pin:            encryptField(creds.pin),
  };
}

/**
 * Decrypt an object of credential fields.
 */
export function decryptCredentials(creds: {
  account_number?: string | null;
  username?:       string | null;
  password?:       string | null;
  pin?:            string | null;
}) {
  return {
    account_number: decryptField(creds.account_number),
    username:       decryptField(creds.username),
    password:       decryptField(creds.password),
    pin:            decryptField(creds.pin),
  };
}
