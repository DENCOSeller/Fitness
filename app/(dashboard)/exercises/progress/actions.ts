'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export interface ExerciseProgressData {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  workoutCount: number;
  personalRecord: { weight: number; date: string } | null;
  firstWeight: number | null;
  lastWeight: number | null;
  progressPct: number | null;
  history: { date: string; maxWeight: number; totalVolume: number }[];
}

export async function getExerciseProgress(periodDays?: number): Promise<ExerciseProgressData[]> {
  const userId = await getCurrentUserId();

  // Get all user's workout sets with exercise info
  const whereDate = periodDays
    ? { gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) }
    : undefined;

  const sets = await prisma.workoutSet.findMany({
    where: {
      workout: { userId },
      weight: { gt: 0 },
      ...(whereDate ? { workout: { userId, date: whereDate } } : {}),
    },
    include: {
      exercise: { select: { id: true, name: true, muscleGroup: true } },
      workout: { select: { date: true } },
    },
    orderBy: { workout: { date: 'asc' } },
  });

  // Group by exercise
  const byExercise = new Map<number, {
    exercise: { id: number; name: string; muscleGroup: string };
    entries: { date: Date; reps: number; weight: number }[];
  }>();

  for (const s of sets) {
    if (!byExercise.has(s.exercise.id)) {
      byExercise.set(s.exercise.id, { exercise: s.exercise, entries: [] });
    }
    byExercise.get(s.exercise.id)!.entries.push({
      date: s.workout.date,
      reps: s.reps,
      weight: s.weight,
    });
  }

  // Also get all-time data for PR calculation (regardless of period filter)
  const allTimeSets = periodDays
    ? await prisma.workoutSet.findMany({
        where: { workout: { userId }, weight: { gt: 0 } },
        include: {
          exercise: { select: { id: true } },
          workout: { select: { date: true } },
        },
      })
    : sets;

  const allTimePR = new Map<number, { weight: number; date: Date }>();
  const allTimeFirst = new Map<number, { weight: number; date: Date }>();
  const allTimeLast = new Map<number, { weight: number; date: Date }>();

  for (const s of allTimeSets) {
    const pr = allTimePR.get(s.exercise.id);
    if (!pr || s.weight > pr.weight) {
      allTimePR.set(s.exercise.id, { weight: s.weight, date: s.workout.date });
    }
    const first = allTimeFirst.get(s.exercise.id);
    if (!first || s.workout.date < first.date) {
      allTimeFirst.set(s.exercise.id, { weight: s.weight, date: s.workout.date });
    }
    const last = allTimeLast.get(s.exercise.id);
    if (!last || s.workout.date > last.date) {
      allTimeLast.set(s.exercise.id, { weight: s.weight, date: s.workout.date });
    }
  }

  // Build results, sorted by workout count desc
  const results: ExerciseProgressData[] = [];

  for (const [exId, data] of byExercise) {
    // Group entries by date
    const byDate = new Map<string, { maxWeight: number; totalVolume: number }>();
    const workoutDates = new Set<string>();

    for (const e of data.entries) {
      const dateStr = e.date.toISOString().split('T')[0];
      workoutDates.add(dateStr);
      const existing = byDate.get(dateStr) || { maxWeight: 0, totalVolume: 0 };
      existing.maxWeight = Math.max(existing.maxWeight, e.weight);
      existing.totalVolume += e.weight * e.reps;
      byDate.set(dateStr, existing);
    }

    const history = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, maxWeight: d.maxWeight, totalVolume: Math.round(d.totalVolume) }));

    const pr = allTimePR.get(exId);
    const first = allTimeFirst.get(exId);
    const last = allTimeLast.get(exId);
    const progressPct = first && last && first.weight > 0 && last.weight !== first.weight
      ? Math.round(((last.weight - first.weight) / first.weight) * 100)
      : null;

    results.push({
      exerciseId: exId,
      exerciseName: data.exercise.name,
      muscleGroup: data.exercise.muscleGroup,
      workoutCount: workoutDates.size,
      personalRecord: pr ? { weight: pr.weight, date: pr.date.toISOString().split('T')[0] } : null,
      firstWeight: first?.weight ?? null,
      lastWeight: last?.weight ?? null,
      progressPct,
      history,
    });
  }

  results.sort((a, b) => b.workoutCount - a.workoutCount);

  return results.slice(0, 20);
}
