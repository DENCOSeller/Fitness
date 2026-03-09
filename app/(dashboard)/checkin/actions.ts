'use server';

import { prisma } from '@/lib/db';

export async function upsertCheckIn(data: {
  wellbeing: number;
  sleep: number;
  stress: number;
  energy: number;
  note: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.checkIn.upsert({
    where: { date: today },
    create: {
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.checkIn.findUnique({
    where: { date: today },
  });
}

export async function getCheckIns(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.checkIn.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'desc' },
  });
}
