import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [salt, stored] = storedHash.split(":");
  if (!salt || !stored) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(stored, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");
  return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer);
}

export function hashVerificationCode(code: string, secret: string) {
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
