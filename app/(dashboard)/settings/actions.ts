'use server';

import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return secret;
}

function sign(value: string): string {
  const signature = createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${signature}`;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) return { success: false, error: 'Пароль не настроен на сервере' };

  const expectedBuf = Buffer.from(expected);
  const currentBuf = Buffer.from(currentPassword);

  if (expectedBuf.length !== currentBuf.length || !timingSafeEqual(expectedBuf, currentBuf)) {
    return { success: false, error: 'Неверный текущий пароль' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'Новый пароль слишком короткий (мин. 4 символа)' };
  }

  // NOTE: changing AUTH_PASSWORD at runtime requires rewriting .env and restarting.
  // For single-user app, just inform the user to update .env manually.
  return { success: false, error: 'Смена пароля: обнови AUTH_PASSWORD в .env и перезапусти сервер' };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
