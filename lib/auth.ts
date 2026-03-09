import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "your-session-secret-here") {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(value: string): string {
  const secret = getSecret();
  const signature = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${signature}`;
}

function unsign(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signed.slice(0, lastDot);
  const expected = sign(value);

  const expectedBuf = Buffer.from(expected);
  const signedBuf = Buffer.from(signed);

  if (expectedBuf.length !== signedBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, signedBuf)) return null;

  return value;
}

export function checkPassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected || expected === "your-password-here") {
    throw new Error("AUTH_PASSWORD is not configured");
  }

  const expectedBuf = Buffer.from(expected);
  const passwordBuf = Buffer.from(password);

  if (expectedBuf.length !== passwordBuf.length) return false;
  return timingSafeEqual(expectedBuf, passwordBuf);
}

export async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const signed = sign(token);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return false;
  return unsign(cookie.value) !== null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
