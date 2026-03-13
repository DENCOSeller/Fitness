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
    const isStrengthLike = ex.type === 'strength' || ex.type === 'bodyweight';
    const aiWeight = isStrengthLike ? (ex.weight || null) : null;
    const historyWeight = isStrengthLike
      ? (lastWeights.get(matches[idx].exerciseId)?.weight ?? null)
      : null;

    return {
      exerciseId: matches[idx].exerciseId,
      exerciseName: ex.name.trim(),
      plannedSets: ex.sets,
      plannedReps: isStrengthLike ? (ex.reps ?? 0) : 0,
      plannedWeight: aiWeight ?? historyWeight,
      restSeconds: ex.restSeconds ?? null,
      sortOrder: idx + 1,
    };
  });

  // Build workout sets (pre-filled from plan for active mode)
  const setsData: {
    exerciseId: number;
    setOrder: number;
    reps: number;
    weight: number;
    duration?: number;
    speed?: number;
    distance?: number;
    incline?: number;
  }[] = [];

  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const ex = exercises[exIdx];
    const exerciseId = matches[exIdx].exerciseId;
    const fallbackWeight = lastWeights.get(exerciseId)?.weight ?? 0;

    for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
      if (ex.type === 'cardio') {
        setsData.push({
          exerciseId,
          setOrder: exIdx * 100 + setIdx + 1,
          reps: 0,
          weight: 0,
          duration: ex.durationMin ?? undefined,
          speed: ex.speedKmh ?? undefined,
          distance: ex.distanceKm ?? undefined,
          incline: ex.inclinePct ?? undefined,
        });
      } else if (ex.type === 'timed') {
        setsData.push({
          exerciseId,
          setOrder: exIdx * 100 + setIdx + 1,
          reps: 0,
          weight: 0,
          duration: ex.durationMin ?? undefined,
        });
      } else {
        // strength / bodyweight
        const weight = ex.weight || fallbackWeight;
        setsData.push({
          exerciseId,
          setOrder: exIdx * 100 + setIdx + 1,
          reps: ex.reps ?? 0,
          weight,
        });
      }
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
