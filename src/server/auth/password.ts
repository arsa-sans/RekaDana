import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

// Precomputed dummy hash used when a login email does not exist to keep verification timing uniform.
const DUMMY_SALT = "00000000000000000000000000000000";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LEN);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, KEY_LEN);
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, keyBuffer);
}

export function burnDummyPasswordVerify(password: string): void {
  scryptSync(password, DUMMY_SALT, KEY_LEN);
}
