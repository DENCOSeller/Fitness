'use server';

import { prisma } from '@/lib/db';

export async function createWorkout(data: {
  date: string;
  type: string;
  durationMin?: number;
  note?: string;
  exercises: {
    exerciseId: number;
    sets: { reps: number; weight: number }[];
  }[];
}) {
  const { date, type, durationMin, note, exercises } = data;

  if (!type.trim()) {
    return { error: 'Выберите тип тренировки' };
  }

  if (exercises.length === 0) {
    return { error: 'Добавьте хотя бы одно упражнение' };
  }

  for (const ex of exercises) {
    if (ex.sets.length === 0) {
      return { error: 'Каждое упражнение должно иметь хотя бы один подход' };
    }
  }

  const workout = await prisma.workout.create({
    data: {
      date: new Date(date),
      type: type.trim(),
      durationMin: durationMin || null,
      note: note?.trim() || null,
      sets: {
        create: exercises.flatMap((ex, exIdx) =>
          ex.sets.map((set, setIdx) => ({
            exerciseId: ex.exerciseId,
            setOrder: exIdx * 100 + setIdx + 1,
            reps: set.reps,
            weight: set.weight,
          }))
        ),
      },
    },
  });

  return { success: true, id: workout.id };
}

export async function getWorkout(id: number) {
  const workout = await prisma.workout.findUnique({
    where: { id },
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

  return { workout };
}

export async function listWorkouts() {
  const workouts = await prisma.workout.findMany({
    orderBy: { date: 'desc' },
    include: {
      sets: {
        include: { exercise: true },
      },
      _count: { select: { sets: true } },
    },
  });

  return workouts;
}

export async function deleteWorkout(id: number) {
  await prisma.workout.delete({ where: { id } });
  return { success: true };
}

export async function createExerciseFromWorkout(data: { name: string; muscleGroup: string }) {
  const name = data.name.trim();
  const muscleGroup = data.muscleGroup.trim();

  if (!name || !muscleGroup) {
    return { error: 'Название и группа мышц обязательны' };
  }

  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    return { exercise: existing };
  }

  const exercise = await prisma.exercise.create({
    data: { name, muscleGroup },
  });

  return { exercise };
}
