'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { findOrCreateExercises } from '@/lib/exercise-matcher';
import { getLastWeightsForExercises } from '@/lib/exercise-history';
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

  // Fallback weights from history for exercises where AI didn't specify weight
  const exerciseIds = matches.map(m => m.exerciseId);
  const lastWeights = await getLastWeightsForExercises(userId, exerciseIds);

  // Build plan exercises (what AI recommended)
  const planData = exercises.map((ex, idx) => {
    const aiWeight = ex.weight || null;
    const historyWeight = lastWeights.get(matches[idx].exerciseId)?.weight ?? null;

    return {
      exerciseId: matches[idx].exerciseId,
      exerciseName: ex.name.trim(),
      plannedSets: ex.sets,
      plannedReps: ex.reps,
      plannedWeight: aiWeight ?? historyWeight,
      restSeconds: ex.restSeconds ?? null,
      sortOrder: idx + 1,
    };
  });

  // Build workout sets (pre-filled from plan for active mode)
  const setsData: { exerciseId: number; setOrder: number; reps: number; weight: number }[] = [];

  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const ex = exercises[exIdx];
    const exerciseId = matches[exIdx].exerciseId;
    const fallbackWeight = lastWeights.get(exerciseId)?.weight ?? 0;
    const weight = ex.weight || fallbackWeight;

    for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
      setsData.push({
        exerciseId,
        setOrder: exIdx * 100 + setIdx + 1,
        reps: ex.reps,
        weight,
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
