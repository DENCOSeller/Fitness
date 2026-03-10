'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function upsertCheckIn(data: {
  wellbeing: number;
  sleep: number;
  stress: number;
  energy: number;
  note: string;
}) {
  const userId = await getCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.checkIn.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      wellbeing: data.wellbeing,
      sleep: data.sleep,
      stress: data.stress,
      energy: data.energy,
      note: data.note || null,
    },
    update: {
      wellbeing: data.wellbeing,
      sleep: data.sleep,
      stress: data.stress,
      energy: data.energy,
      note: data.note || null,
    },
  });
}

export async function getTodayCheckIn() {
  const userId = await getCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.checkIn.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}

export async function getCheckIns(days: number = 30) {
  const userId = await getCurrentUserId();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.checkIn.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'desc' },
  });
}
