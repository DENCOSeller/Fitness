'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function getExerciseProgress(id: number) {
  const userId = await getCurrentUserId();
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      workoutSets: {
        include: {
          workout: {
            select: { id: true, date: true, type: true, userId: true },
          },
        },
        orderBy: { workout: { date: 'desc' } },
      },
    },
  });

  if (!exercise || (exercise.userId !== userId && !exercise.isSystem)) {
    return { error: 'Упражнение не найдено' };
  }

  const isCardio = exercise.type === 'cardio' || exercise.muscleGroup === 'Кардио';

  // Group sets by workout (only user's workouts)
  const workoutMap = new Map<
    number,
    {
      workoutId: number;
      date: string;
      workoutType: string;
      sets: { setOrder: number; reps: number; weight: number; duration: number | null; distance: number | null; speed: number | null; incline: number | null; heartRate: number | null }[];
    }
  >();

  for (const set of exercise.workoutSets) {
    if (set.workout.userId !== userId) continue;
    const wId = set.workout.id;
    if (!workoutMap.has(wId)) {
      workoutMap.set(wId, {
        workoutId: wId,
        date: set.workout.date.toISOString(),
        workoutType: set.workout.type,
        sets: [],
      });
    }
    workoutMap.get(wId)!.sets.push({
      setOrder: set.setOrder,
      reps: set.reps,
      weight: Number(set.weight),
      duration: set.duration,
      distance: set.distance ? Number(set.distance) : null,
      speed: set.speed ? Number(set.speed) : null,
      incline: set.incline ? Number(set.incline) : null,
      heartRate: set.heartRate,
    });
  }

  // Sort sets within each workout and calculate aggregates
  const history = Array.from(workoutMap.values()).map((entry) => {
    entry.sets.sort((a, b) => a.setOrder - b.setOrder);
    if (isCardio) {
      const totalDuration = entry.sets.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalDistance = entry.sets.reduce((sum, s) => sum + (s.distance || 0), 0);
      return { ...entry, maxWeight: 0, totalVolume: 0, totalDuration, totalDistance };
    }
    const maxWeight = Math.max(...entry.sets.map((s) => s.weight));
    const totalVolume = entry.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
    return { ...entry, maxWeight, totalVolume, totalDuration: 0, totalDistance: 0 };
  });

  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    type: exercise.type,
    isSystem: exercise.isSystem,
    description: exercise.description,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    tips: exercise.tips,
    history,
  };
}
