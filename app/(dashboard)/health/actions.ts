'use server';

import { prisma } from '@/lib/db';

export async function getHealthDaily(limit: number = 90) {
  const records = await prisma.healthDaily.findMany({
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
  const workouts = await prisma.healthWorkout.findMany({
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

export async function getHealthStats() {
  const totalDaily = await prisma.healthDaily.count();
  const totalWorkouts = await prisma.healthWorkout.count();

  const latest = await prisma.healthDaily.findFirst({
    orderBy: { date: 'desc' },
  });

  const earliest = await prisma.healthDaily.findFirst({
    orderBy: { date: 'asc' },
  });

  return {
    totalDaily,
    totalWorkouts,
    latestDate: latest?.date.toISOString().split('T')[0] || null,
    earliestDate: earliest?.date.toISOString().split('T')[0] || null,
  };
}
