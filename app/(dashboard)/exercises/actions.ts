'use server';

import { prisma } from '@/lib/db';

export async function getExercises() {
  return prisma.exercise.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { workoutSets: true },
      },
    },
  });
}

export async function createExercise(data: { name: string; muscleGroup: string }) {
  const name = data.name.trim();
  const muscleGroup = data.muscleGroup.trim();

  if (!name || !muscleGroup) {
    return { error: 'Название и группа мышц обязательны' };
  }

  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    return { error: 'Упражнение с таким названием уже существует' };
  }

  await prisma.exercise.create({
    data: { name, muscleGroup },
  });

  return { success: true };
}

export async function deleteExercise(id: number) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      _count: {
        select: { workoutSets: true, templateExercises: true },
      },
    },
  });

  if (!exercise) {
    return { error: 'Упражнение не найдено' };
  }

  if (exercise._count.workoutSets > 0 || exercise._count.templateExercises > 0) {
    return { error: 'Нельзя удалить — упражнение используется в тренировках' };
  }

  await prisma.exercise.delete({ where: { id } });

  return { success: true };
}
