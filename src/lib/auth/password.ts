/**
 * Password hashing helpers — Node.js only (not Edge Runtime).
 * Uses scrypt (built-in, no external deps) with random salt.
 */

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const testHash = scryptSync(password, salt, KEY_LENGTH);
    const storedHash = Buffer.from(hash, "hex");
    if (testHash.length !== storedHash.length) return false;
    return timingSafeEqual(testHash, storedHash);
  } catch {
    return false;
  }
}
