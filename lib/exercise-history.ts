import { prisma } from '@/lib/db';

interface LastWeight {
  weight: number;
  reps: number;
  date: Date;
}

/**
 * Get last used weight for multiple exercises in one query.
 * Returns a Map of exerciseId → { weight, reps, date }.
 * Only considers completed sets from completed workouts.
 */
export async function getLastWeightsForExercises(
  userId: number,
  exerciseIds: number[],
): Promise<Map<number, LastWeight>> {
  if (exerciseIds.length === 0) return new Map();

  const uniqueIds = [...new Set(exerciseIds)];

  // For each exercise, get the most recent completed set
  const rows = await prisma.$queryRaw<
    { exercise_id: number; weight: number; reps: number; date: Date }[]
  >`
    SELECT DISTINCT ON (ws.exercise_id)
      ws.exercise_id,
      ws.weight,
      ws.reps,
      w.date
    FROM workout_sets ws
    JOIN workouts w ON w.id = ws.workout_id
    WHERE w.user_id = ${userId}
      AND w.status = 'completed'
      AND ws.completed = true
      AND ws.weight > 0
      AND ws.exercise_id = ANY(${uniqueIds})
    ORDER BY ws.exercise_id, w.date DESC, ws.set_order DESC
  `;

  const result = new Map<number, LastWeight>();
  for (const row of rows) {
    result.set(row.exercise_id, {
      weight: row.weight,
      reps: row.reps,
      date: row.date,
    });
  }

  return result;
}
