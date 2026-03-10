'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function getHealthDaily(limit: number = 90) {
  const userId = await getCurrentUserId();
  const records = await prisma.healthDaily.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return records.map((r) => ({
    id: r.id,
    date: r.date.toISOString().split('T')[0],
    steps: r.steps,
    activeCalories: r.activeCalories,
    restingHr: r.restingHr,
    sleepHours: r.sleepHours,
  }));
}

export async function getHealthWorkouts(limit: number = 50) {
  const userId = await getCurrentUserId();
  const workouts = await prisma.healthWorkout.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return workouts.map((w) => ({
    id: w.id,
    date: w.date.toISOString().split('T')[0],
    type: w.type,
    durationMin: w.durationMin,
    calories: w.calories,
    source: w.source,
  }));
}

export async function getHealthDailyByPeriod(period: 'week' | 'month' | '3months' | 'year') {
  const userId = await getCurrentUserId();
  const now = new Date();
  const from = new Date();
  switch (period) {
    case 'week': from.setDate(now.getDate() - 7); break;
    case 'month': from.setMonth(now.getMonth() - 1); break;
    case '3months': from.setMonth(now.getMonth() - 3); break;
    case 'year': from.setFullYear(now.getFullYear() - 1); break;
  }

  const records = await prisma.healthDaily.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: 'asc' },
  });

  return records.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    steps: r.steps,
    activeCalories: r.activeCalories,
    restingHr: r.restingHr,
    sleepHours: r.sleepHours,
  }));
}

export async function getHealthStats() {
  const userId = await getCurrentUserId();
  const totalDaily = await prisma.healthDaily.count({ where: { userId } });
  const totalWorkouts = await prisma.healthWorkout.count({ where: { userId } });

  const latest = await prisma.healthDaily.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  const earliest = await prisma.healthDaily.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  return {
    totalDaily,
    totalWorkouts,
    latestDate: latest?.date.toISOString().split('T')[0] || null,
    earliestDate: earliest?.date.toISOString().split('T')[0] || null,
  };
}
