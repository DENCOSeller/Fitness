'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export type MeasurementZone = 'neck' | 'chest' | 'waist' | 'belly' | 'hips' | 'glutes' | 'thigh' | 'calf' | 'shoulder';

export const ZONE_LABELS: Record<MeasurementZone, string> = {
  neck: 'Шея',
  chest: 'Грудь',
  shoulder: 'Плечо',
  waist: 'Талия',
  belly: 'Живот',
  hips: 'Бёдра',
  glutes: 'Ягодицы',
  thigh: 'Бедро',
  calf: 'Голень',
};

export const ALL_ZONES: MeasurementZone[] = ['neck', 'chest', 'shoulder', 'waist', 'belly', 'hips', 'glutes', 'thigh', 'calf'];

export type MeasurementRecord = {
  id: number;
  date: string;
  neck: number | null;
  chest: number | null;
  waist: number | null;
  belly: number | null;
  hips: number | null;
  glutes: number | null;
  thigh: number | null;
  calf: number | null;
  shoulder: number | null;
};

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

export async function deleteMeasurement(id: number) {
  const userId = await getCurrentUserId();
  const m = await prisma.bodyMeasurement.findUnique({ where: { id } });
  if (!m || m.userId !== userId) return { error: 'Не найдено' };
  await prisma.bodyMeasurement.delete({ where: { id } });
  return { success: true };
}
