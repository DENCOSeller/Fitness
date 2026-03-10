'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export interface MetricPoint {
  date: string;
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
}

export async function getBodyMetrics(days?: number): Promise<MetricPoint[]> {
  const userId = await getCurrentUserId();

  const where: Record<string, unknown> = { userId };
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    where.date = { gte: since };
  }

  const metrics = await prisma.bodyMetric.findMany({
    where,
    orderBy: { date: 'asc' },
    select: { date: true, weight: true, bodyFatPct: true, muscleMass: true },
  });

  return metrics.map(m => ({
    date: m.date.toISOString().split('T')[0],
    weight: m.weight,
    bodyFatPct: m.bodyFatPct,
    muscleMass: m.muscleMass,
  }));
}
