'use server';

import { prisma } from '@/lib/db';

export async function createTemplateFromWorkout(workoutId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: 'Введите название шаблона' };
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setOrder: 'asc' },
      },
    },
  });

  if (!workout) {
    return { error: 'Тренировка не найдена' };
  }

  // Group sets by exercise (preserving order)
  const exerciseGroups: { exerciseId: number; sets: { reps: number; weight: number }[] }[] = [];
  let currentExId = -1;

  for (const set of workout.sets) {
    if (set.exerciseId !== currentExId) {
      exerciseGroups.push({ exerciseId: set.exerciseId, sets: [] });
      currentExId = set.exerciseId;
    }
    exerciseGroups[exerciseGroups.length - 1].sets.push({
      reps: set.reps,
      weight: set.weight,
    });
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      name: trimmed,
      exercises: {
        create: exerciseGroups.map((group, idx) => ({
          exerciseId: group.exerciseId,
          sets: group.sets.length,
          reps: group.sets[0]?.reps || 0,
          weight: group.sets[0]?.weight || 0,
          sortOrder: idx + 1,
        })),
      },
    },
  });

  return { success: true, id: template.id };
}

export async function listTemplates() {
  const templates = await prisma.workoutTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return templates;
}

export async function getTemplate(id: number) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!template) {
    return { error: 'Шаблон не найден' };
  }

  return { template };
}

export async function deleteTemplate(id: number) {
  await prisma.workoutTemplate.delete({ where: { id } });
  return { success: true };
}
