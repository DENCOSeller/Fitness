'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function getExercises() {
  const userId = await getCurrentUserId();
  return prisma.exercise.findMany({
    where: {
      OR: [
        { userId },
        { isSystem: true },
      ],
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { workoutSets: true },
      },
    },
  });
}

export async function createExercise(data: { name: string; muscleGroup: string }) {
  const userId = await getCurrentUserId();
  const name = data.name.trim();
  const muscleGroup = data.muscleGroup.trim();

  if (!name || !muscleGroup) {
    return { error: 'Название и группа мышц обязательны' };
  }

  const existing = await prisma.exercise.findFirst({
    where: {
      OR: [
        { userId, name: { equals: name, mode: 'insensitive' } },
        { isSystem: true, name: { equals: name, mode: 'insensitive' } },
      ],
    },
  });

  if (existing) {
    return { error: 'Упражнение с таким названием уже существует' };
  }

  await prisma.exercise.create({
    data: { userId, name, muscleGroup },
  });

  return { success: true };
}

export async function deleteExercise(id: number) {
  const userId = await getCurrentUserId();
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      _count: {
        select: { workoutSets: true, templateExercises: true },
      },
    },
  });

  if (!exercise || (exercise.userId !== userId && !exercise.isSystem)) {
    return { error: 'Упражнение не найдено' };
  }

  if (exercise.isSystem) {
    return { error: 'Нельзя удалить системное упражнение' };
  }

  if (exercise._count.workoutSets > 0 || exercise._count.templateExercises > 0) {
    return { error: 'Нельзя удалить — упражнение используется в тренировках' };
  }

  await prisma.exercise.delete({ where: { id } });

  return { success: true };
}
