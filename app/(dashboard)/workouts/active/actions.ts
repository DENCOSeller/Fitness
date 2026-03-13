'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function startWorkout(type: string) {
  const userId = await getCurrentUserId();

  const existing = await prisma.workout.findFirst({
    where: { userId, status: 'in_progress' },
  });
  if (existing) {
    return { error: 'У вас уже есть незавершённая тренировка', workoutId: existing.id };
  }

  const now = new Date();
  const workout = await prisma.workout.create({
    data: {
      userId,
      date: now,
      type: type.trim(),
      status: 'in_progress',
      startedAt: now,
    },
  });

  return { workout };
}

export async function getActiveWorkout() {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findFirst({
    where: { userId, status: 'in_progress' },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setOrder: 'asc' },
      },
      planExercises: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return { workout };
}

export async function startPlannedWorkout(
  workoutId: number,
  overrides?: { planExerciseId: number; sets: { reps: number; weight: number }[] }[],
) {
  const userId = await getCurrentUserId();

  const existing = await prisma.workout.findFirst({
    where: { userId, status: 'in_progress' },
  });
  if (existing) {
    return { error: 'У вас уже есть незавершённая тренировка', workoutId: existing.id };
  }

  const planned = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      planExercises: {
        include: { exercise: true },
        orderBy: { sortOrder: 'asc' },
      },
      sets: true,
    },
  });
  if (!planned || planned.userId !== userId) {
    return { error: 'Тренировка не найдена' };
  }
  if (planned.status !== 'planned') {
    return { error: 'Тренировка уже начата или завершена' };
  }

  // Create WorkoutSets from planExercises (or overrides)
  if (planned.sets.length === 0 && planned.planExercises.length > 0) {
    const setsToCreate: {
      workoutId: number;
      exerciseId: number;
      setOrder: number;
      reps: number;
      weight: number;
      completed: boolean;
    }[] = [];

    for (const [peIdx, pe] of planned.planExercises.entries()) {
      if (!pe.exerciseId) continue;

      const override = overrides?.find((o) => o.planExerciseId === pe.id);
      const setCount = override ? override.sets.length : pe.plannedSets;

      for (let i = 0; i < setCount; i++) {
        setsToCreate.push({
          workoutId,
          exerciseId: pe.exerciseId,
          setOrder: peIdx * 100 + i + 1,
          reps: override ? override.sets[i].reps : pe.plannedReps,
          weight: override ? override.sets[i].weight : (pe.plannedWeight ?? 0),
          completed: false,
        });
      }
    }

    if (setsToCreate.length > 0) {
      await prisma.workoutSet.createMany({ data: setsToCreate });
    }
  }

  const now = new Date();
  const workout = await prisma.workout.update({
    where: { id: workoutId },
    data: { status: 'in_progress', startedAt: now },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setOrder: 'asc' },
      },
    },
  });

  return { workout };
}

export async function addExerciseToWorkout(workoutId: number, exerciseId: number) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId || workout.status !== 'in_progress') {
    return { error: 'Тренировка не найдена или уже завершена' };
  }

  const exists = await prisma.workoutSet.findFirst({
    where: { workoutId, exerciseId },
  });
  if (exists) {
    return { error: 'Упражнение уже добавлено' };
  }

  const lastSet = await prisma.workoutSet.findFirst({
    where: { workoutId },
    orderBy: { setOrder: 'desc' },
  });
  const nextBlock = lastSet ? Math.floor(lastSet.setOrder / 100) * 100 + 100 : 100;

  const set = await prisma.workoutSet.create({
    data: {
      workoutId,
      exerciseId,
      setOrder: nextBlock + 1,
      reps: 0,
      weight: 0,
      completed: false,
    },
    include: { exercise: true },
  });

  return { set };
}

export async function addSetToWorkout(
  workoutId: number,
  exerciseId: number,
  data: { reps: number; weight: number; duration?: number; speed?: number; incline?: number; distance?: number },
) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId || workout.status !== 'in_progress') {
    return { error: 'Тренировка не найдена или уже завершена' };
  }

  const lastSet = await prisma.workoutSet.findFirst({
    where: { workoutId, exerciseId },
    orderBy: { setOrder: 'desc' },
  });
  if (!lastSet) {
    return { error: 'Сначала добавьте упражнение' };
  }

  const set = await prisma.workoutSet.create({
    data: {
      workoutId,
      exerciseId,
      setOrder: lastSet.setOrder + 1,
      reps: data.reps,
      weight: data.weight,
      duration: data.duration ?? null,
      speed: data.speed ?? null,
      incline: data.incline ?? null,
      distance: data.distance ?? null,
      completed: false,
    },
    include: { exercise: true },
  });

  return { set };
}

export async function updateSet(
  setId: number,
  data: { reps: number; weight: number; duration?: number; speed?: number; incline?: number; distance?: number },
) {
  const userId = await getCurrentUserId();

  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workout: true },
  });
  if (!set || set.workout.userId !== userId) {
    return { error: 'Подход не найден' };
  }

  const updated = await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      reps: data.reps,
      weight: data.weight,
      duration: data.duration ?? null,
      speed: data.speed ?? null,
      incline: data.incline ?? null,
      distance: data.distance ?? null,
    },
    include: { exercise: true },
  });

  return { set: updated };
}

export async function startSet(setId: number) {
  const userId = await getCurrentUserId();

  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workout: true },
  });
  if (!set || set.workout.userId !== userId) {
    return { error: 'Подход не найден' };
  }
  if (set.setStartedAt) return { success: true };

  await prisma.workoutSet.update({
    where: { id: setId },
    data: { setStartedAt: new Date() },
  });

  return { success: true };
}

export async function completeSet(setId: number) {
  const userId = await getCurrentUserId();

  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workout: true },
  });
  if (!set || set.workout.userId !== userId) {
    return { error: 'Подход не найден' };
  }

  const now = new Date();
  const updated = await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      completed: true,
      completedAt: now,
      setEndedAt: now,
      setStartedAt: set.setStartedAt ?? now,
    },
    include: { exercise: true },
  });

  return { set: updated };
}

export async function finishWorkout(workoutId: number) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId) {
    return { error: 'Тренировка не найдена' };
  }
  if (workout.status !== 'in_progress') {
    return { error: 'Тренировка не активна' };
  }

  const endedAt = new Date();
  const durationMin = workout.startedAt
    ? Math.round((endedAt.getTime() - workout.startedAt.getTime()) / 60000)
    : null;

  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: { status: 'completed', endedAt, durationMin },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setOrder: 'asc' },
      },
    },
  });

  return { workout: updated };
}

export async function discardWorkout(workoutId: number) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId) {
    return { error: 'Тренировка не найдена' };
  }
  if (workout.status !== 'in_progress') {
    return { error: 'Можно удалить только незавершённую тренировку' };
  }

  await prisma.workout.delete({ where: { id: workoutId } });
  return { success: true };
}

export async function replaceExerciseInWorkout(
  workoutId: number,
  oldExerciseId: number,
  newExerciseId: number,
) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId || workout.status !== 'in_progress') {
    return { error: 'Тренировка не найдена или уже завершена' };
  }

  await prisma.workoutSet.updateMany({
    where: { workoutId, exerciseId: oldExerciseId },
    data: { exerciseId: newExerciseId },
  });

  return { success: true };
}

export async function removeExerciseFromWorkout(
  workoutId: number,
  exerciseId: number,
) {
  const userId = await getCurrentUserId();

  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.userId !== userId || workout.status !== 'in_progress') {
    return { error: 'Тренировка не найдена или уже завершена' };
  }

  await prisma.workoutSet.deleteMany({
    where: { workoutId, exerciseId },
  });

  return { success: true };
}
