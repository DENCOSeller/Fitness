'use server';

import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  return user;
}
