'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import type { MeasurementZone } from '@/lib/measurement-types';

export async function saveMeasurement(data: {
  date: string;
  zone: MeasurementZone;
  value: number;
}) {
  const userId = await getCurrentUserId();
  const date = new Date(data.date + 'T00:00:00');

  const existing = await prisma.bodyMeasurement.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    return prisma.bodyMeasurement.update({
      where: { id: existing.id },
      data: { [data.zone]: data.value },
    });
  }

  return prisma.bodyMeasurement.create({
    data: {
      userId,
      date,
      [data.zone]: data.value,
    },
  });
}

export async function getMeasurements(limit = 90) {
  const userId = await getCurrentUserId();
  return prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

export async function getUserHeight(): Promise<number | null> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { height: true },
  });
  return user?.height ?? null;
}

export async function deleteMeasurement(id: number) {
  const userId = await getCurrentUserId();
  const m = await prisma.bodyMeasurement.findUnique({ where: { id } });
  if (!m || m.userId !== userId) return { error: 'Не найдено' };
  await prisma.bodyMeasurement.delete({ where: { id } });
  return { success: true };
}
