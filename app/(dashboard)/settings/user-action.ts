'use server';

import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, age: true, height: true, goal: true, targetWeight: true },
  });
}

export async function updateProfile(data: {
  name?: string;
  age?: number | null;
  height?: number | null;
  goal?: string | null;
  targetWeight?: number | null;
}) {
  const userId = await getCurrentUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name?.trim() || null,
      age: data.age ?? null,
      height: data.height ?? null,
      goal: data.goal ?? null,
      targetWeight: data.targetWeight ?? null,
    },
  });
  return { success: true };
}
