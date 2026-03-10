'use server';

import { cookies } from 'next/headers';
import { getCurrentUserId, hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'Пользователь не найден' };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: 'Неверный текущий пароль' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'Новый пароль слишком короткий (мин. 4 символа)' };
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
