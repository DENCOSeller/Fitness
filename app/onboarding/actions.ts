'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function completeOnboarding(data: {
  name: string;
  gender: string;
  birthDate: string;
  height: number;
  weight: number;
  targetWeight: number;
  activityLevel: string;
  goal: string;
}) {
  const userId = await getCurrentUserId();

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name.trim() || null,
      gender: data.gender,
      birthDate: new Date(data.birthDate + 'T00:00:00'),
      height: data.height,
      goal: data.goal,
      targetWeight: data.targetWeight,
      activityLevel: data.activityLevel,
      onboardingCompleted: true,
    },
  });

  // Save initial weight as body metric
  if (data.weight > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.bodyMetric.upsert({
      where: {
        id: (await prisma.bodyMetric.findFirst({
          where: { userId, date: today },
          select: { id: true },
        }))?.id ?? 0,
      },
      update: { weight: data.weight },
      create: {
        userId,
        date: today,
        weight: data.weight,
      },
    });
  }

  return { success: true };
}

export async function checkOnboardingStatus() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  });
  return user?.onboardingCompleted ?? false;
}
