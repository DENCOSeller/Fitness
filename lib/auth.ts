import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const BCRYPT_ROUNDS = 10;

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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует" };
  }

  if (password.length < 4) {
    return { error: "Пароль слишком короткий (мин. 4 символа)" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name?.trim() || null,
    },
  });

  return { user };
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { error: "Неверный email или пароль" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Неверный email или пароль" };
  }

  return { user };
}

export async function createSession(userId: number): Promise<void> {
  const signed = sign(String(userId));

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.BASE_URL?.startsWith("https://") ?? false,
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function validateSession(): Promise<boolean> {
  const userId = await getSessionUserId();
  return userId !== null;
}

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;

  const value = unsign(cookie.value);
  if (!value) return null;

  const userId = parseInt(value, 10);
  if (isNaN(userId)) return null;

  return userId;
}

/** Get current user ID or throw. Use in server actions. */
export async function getCurrentUserId(): Promise<number> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Не авторизован");
  }
  return userId;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
