'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export type CalorieBalance = {
  bmr: number | null;          // СООВ из Picooc
  workoutBurned: number;       // Сожжено за тренировки (формула)
  dailyNorm: number | null;    // BMR + сожжено (- 500 при похудении)
  eaten: number;               // Съедено из записей питания
  remaining: number | null;    // Сколько можно ещё съесть
  deficit: boolean;            // Применён дефицит -500
  goal: string | null;
};

export async function getCalorieBalance(dateStr?: string): Promise<CalorieBalance> {
  const userId = await getCurrentUserId();
  const date = dateStr
    ? new Date(dateStr + 'T00:00:00')
    : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const [latestBody, user, todayMeals, todayWorkouts] = await Promise.all([
    // Последний замер Picooc с BMR
    prisma.bodyMetric.findFirst({
      where: { userId, bmr: { not: null } },
      orderBy: { date: 'desc' },
      select: { bmr: true },
    }),
    // Профиль пользователя
    prisma.user.findUnique({
      where: { id: userId },
      select: { goal: true, targetWeight: true },
    }),
    // Приёмы пищи за день
    prisma.meal.findMany({
      where: { userId, date },
      select: { calories: true },
    }),
    // Тренировки за день с подходами
    prisma.workout.findMany({
      where: { userId, date },
      include: {
        sets: { select: { weight: true, reps: true } },
      },
    }),
  ]);

  const bmr = latestBody?.bmr ?? null;

  // Сожжённые калории: сумма(вес * повторения * 0.1) по всем подходам
  let workoutBurned = 0;
  for (const workout of todayWorkouts) {
    for (const set of workout.sets) {
      workoutBurned += set.weight * set.reps * 0.1;
    }
  }
  workoutBurned = Math.round(workoutBurned);

  // Съедено
  const eaten = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  // Дефицит при похудении
  const isLoss = user?.goal === 'loss';

  // Дневная норма = BMR + сожжено (- 500 при цели "похудение")
  let dailyNorm: number | null = null;
  if (bmr !== null) {
    dailyNorm = Math.round(bmr + workoutBurned - (isLoss ? 500 : 0));
  }

  const remaining = dailyNorm !== null ? dailyNorm - eaten : null;

  return {
    bmr,
    workoutBurned,
    dailyNorm,
    eaten,
    remaining,
    deficit: isLoss,
    goal: user?.goal ?? null,
  };
}
