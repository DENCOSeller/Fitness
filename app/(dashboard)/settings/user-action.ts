'use server';

import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, gender: true, birthDate: true, height: true, goal: true, targetWeight: true, activityLevel: true },
  });
}

export async function updateProfile(data: {
  name?: string;
  gender?: string | null;
  birthDate?: string | null;
  height?: number | null;
  goal?: string | null;
  targetWeight?: number | null;
  activityLevel?: string | null;
}) {
  const userId = await getCurrentUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name?.trim() || null,
      gender: data.gender ?? undefined,
      birthDate: data.birthDate ? new Date(data.birthDate + 'T00:00:00') : undefined,
      height: data.height ?? null,
      goal: data.goal ?? null,
      targetWeight: data.targetWeight ?? null,
      activityLevel: data.activityLevel ?? undefined,
    },
  });
  return { success: true };
}
