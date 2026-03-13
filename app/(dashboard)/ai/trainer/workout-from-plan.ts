'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { findOrCreateExercises } from '@/lib/exercise-matcher';
import type { ParsedExercise } from '@/lib/workout-plan-parser';

export async function createWorkoutFromPlan(
  exercises: ParsedExercise[],
  workoutType?: string,
): Promise<{ success: boolean; id?: number; error?: string }> {
  const userId = await getCurrentUserId();

  // Match all exercise names against DB (fuzzy search + auto-create)
  const matches = await findOrCreateExercises(
    exercises.map(ex => ex.name),
    userId,
  );

  // Build plan exercises (what AI recommended)
  const planData = exercises.map((ex, idx) => ({
    exerciseId: matches[idx].exerciseId,
    exerciseName: ex.name.trim(),
    plannedSets: ex.sets,
    plannedReps: ex.reps,
    plannedWeight: ex.weight || null,
    restSeconds: ex.restSeconds ?? null,
    sortOrder: idx + 1,
  }));

  // Build workout sets (pre-filled from plan for active mode)
  const setsData: { exerciseId: number; setOrder: number; reps: number; weight: number }[] = [];

  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const ex = exercises[exIdx];
    const exerciseId = matches[exIdx].exerciseId;

    for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
      setsData.push({
        exerciseId,
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
      planExercises: { create: planData },
      sets: { create: setsData },
    },
  });

  return { success: true, id: workout.id };
}
