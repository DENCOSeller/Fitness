'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function getWorkoutWithPlan(workoutId: number) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      planExercises: {
        include: { exercise: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!workout || workout.userId !== userId) {
    return { error: 'Тренировка не найдена' };
  }

  // Get last weights for each exercise
  const exerciseIds = workout.planExercises
    .map((pe) => pe.exerciseId)
    .filter((id): id is number => id !== null);

  const lastWeights: Record<
    number,
    { reps: number; weight: number; date: Date }
  > = {};

  if (exerciseIds.length > 0) {
    for (const exId of exerciseIds) {
      const lastSet = await prisma.workoutSet.findFirst({
        where: {
          exerciseId: exId,
          workout: { userId, status: 'completed' },
          reps: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        include: { workout: { select: { date: true } } },
      });
      if (lastSet) {
        lastWeights[exId] = {
          reps: lastSet.reps,
          weight: lastSet.weight,
          date: lastSet.workout.date,
        };
      }
    }
  }

  return { workout, lastWeights };
}

export async function updatePlanExercise(
  planExerciseId: number,
  data: { plannedSets?: number; plannedReps?: number; plannedWeight?: number },
) {
  const userId = await getCurrentUserId();

  const pe = await prisma.workoutPlanExercise.findUnique({
    where: { id: planExerciseId },
    include: { workout: { select: { userId: true, status: true } } },
  });
  if (!pe || pe.workout.userId !== userId || pe.workout.status !== 'planned') {
    return { error: 'Не найдено' };
  }

  const updated = await prisma.workoutPlanExercise.update({
    where: { id: planExerciseId },
    data: {
      ...(data.plannedSets !== undefined && { plannedSets: data.plannedSets }),
      ...(data.plannedReps !== undefined && { plannedReps: data.plannedReps }),
      ...(data.plannedWeight !== undefined && {
        plannedWeight: data.plannedWeight,
      }),
    },
    include: { exercise: true },
  });

  return { planExercise: updated };
}

export async function addSetToPlan(planExerciseId: number) {
  const userId = await getCurrentUserId();

  const pe = await prisma.workoutPlanExercise.findUnique({
    where: { id: planExerciseId },
    include: { workout: { select: { userId: true, status: true } } },
  });
  if (!pe || pe.workout.userId !== userId || pe.workout.status !== 'planned') {
    return { error: 'Не найдено' };
  }

  const updated = await prisma.workoutPlanExercise.update({
    where: { id: planExerciseId },
    data: { plannedSets: pe.plannedSets + 1 },
  });

  return { planExercise: updated };
}

export async function removeSetFromPlan(planExerciseId: number) {
  const userId = await getCurrentUserId();

  const pe = await prisma.workoutPlanExercise.findUnique({
    where: { id: planExerciseId },
    include: { workout: { select: { userId: true, status: true } } },
  });
  if (!pe || pe.workout.userId !== userId || pe.workout.status !== 'planned') {
    return { error: 'Не найдено' };
  }
  if (pe.plannedSets <= 1) {
    return { error: 'Минимум 1 подход' };
  }

  const updated = await prisma.workoutPlanExercise.update({
    where: { id: planExerciseId },
    data: { plannedSets: pe.plannedSets - 1 },
  });

  return { planExercise: updated };
}

export async function addExerciseToPlan(
  workoutId: number,
  exerciseId: number,
) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { planExercises: { orderBy: { sortOrder: 'desc' }, take: 1 } },
  });
  if (!workout || workout.userId !== userId || workout.status !== 'planned') {
    return { error: 'Тренировка не найдена' };
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });
  if (!exercise) {
    return { error: 'Упражнение не найдено' };
  }

  const nextOrder =
    workout.planExercises.length > 0
      ? workout.planExercises[0].sortOrder + 1
      : 0;

  const pe = await prisma.workoutPlanExercise.create({
    data: {
      workoutId,
      exerciseId,
      exerciseName: exercise.name,
      plannedSets: 3,
      plannedReps: 10,
      plannedWeight: 0,
      restSeconds: 90,
      sortOrder: nextOrder,
    },
    include: { exercise: true },
  });

  return { planExercise: pe };
}

export async function removeExerciseFromPlan(
  workoutId: number,
  planExerciseId: number,
) {
  const userId = await getCurrentUserId();

  const pe = await prisma.workoutPlanExercise.findUnique({
    where: { id: planExerciseId },
    include: { workout: { select: { userId: true, status: true } } },
  });
  if (!pe || pe.workout.userId !== userId || pe.workout.status !== 'planned') {
    return { error: 'Не найдено' };
  }
  if (pe.workoutId !== workoutId) {
    return { error: 'Не найдено' };
  }

  await prisma.workoutPlanExercise.delete({ where: { id: planExerciseId } });
  return { success: true };
}

export async function updateRestSeconds(
  planExerciseId: number,
  restSeconds: number,
) {
  const userId = await getCurrentUserId();

  const pe = await prisma.workoutPlanExercise.findUnique({
    where: { id: planExerciseId },
    include: { workout: { select: { userId: true, status: true } } },
  });
  if (!pe || pe.workout.userId !== userId || pe.workout.status !== 'planned') {
    return { error: 'Не найдено' };
  }

  const updated = await prisma.workoutPlanExercise.update({
    where: { id: planExerciseId },
    data: { restSeconds },
  });

  return { planExercise: updated };
}
