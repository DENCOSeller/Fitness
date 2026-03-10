'use server';

import { prisma } from '@/lib/db';

export async function getExerciseProgress(id: number) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      workoutSets: {
        include: {
          workout: {
            select: { id: true, date: true, type: true },
          },
        },
        orderBy: { workout: { date: 'desc' } },
      },
    },
  });

  if (!exercise) {
    return { error: 'Упражнение не найдено' };
  }

  // Group sets by workout
  const workoutMap = new Map<
    number,
    {
      workoutId: number;
      date: string;
      workoutType: string;
      sets: { setOrder: number; reps: number; weight: number }[];
    }
  >();

  for (const set of exercise.workoutSets) {
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
    });
  }

  // Sort sets within each workout and calculate aggregates
  const history = Array.from(workoutMap.values()).map((entry) => {
    entry.sets.sort((a, b) => a.setOrder - b.setOrder);
    const maxWeight = Math.max(...entry.sets.map((s) => s.weight));
    const totalVolume = entry.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
    return { ...entry, maxWeight, totalVolume };
  });

  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    history,
  };
}
