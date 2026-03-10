'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import type { ParsedExercise } from '@/lib/workout-plan-parser';

// Create a planned workout from parsed exercises
export async function createWorkoutFromPlan(exercises: ParsedExercise[], workoutType?: string): Promise<{ success: boolean; id?: number; error?: string }> {
  const userId = await getCurrentUserId();

  const setsData: { exerciseId: number; setOrder: number; reps: number; weight: number }[] = [];

  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const ex = exercises[exIdx];

    // Find exercise in DB (system or user's own)
    let dbExercise = await prisma.exercise.findFirst({
      where: {
        OR: [
          { isSystem: true, name: { equals: ex.name, mode: 'insensitive' } },
          { userId, name: { equals: ex.name, mode: 'insensitive' } },
        ],
      },
    });

    // If not found, try partial match
    if (!dbExercise) {
      dbExercise = await prisma.exercise.findFirst({
        where: {
          OR: [
            { isSystem: true, name: { contains: ex.name, mode: 'insensitive' } },
            { userId, name: { contains: ex.name, mode: 'insensitive' } },
          ],
        },
      });
    }

    // If still not found, create a user exercise
    if (!dbExercise) {
      dbExercise = await prisma.exercise.create({
        data: {
          userId,
          name: ex.name,
          muscleGroup: 'Другое',
          type: 'strength',
        },
      });
    }

    // Create sets
    for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
      setsData.push({
        exerciseId: dbExercise.id,
        setOrder: exIdx * 100 + setIdx + 1,
        reps: ex.reps,
        weight: ex.weight,
      });
    }
  }

  const workout = await prisma.workout.create({
    data: {
      userId,
      date: new Date(),
      type: workoutType || 'Силовая',
      status: 'planned',
      note: 'Создано из плана AI тренера',
      sets: { create: setsData },
    },
  });

  return { success: true, id: workout.id };
}
