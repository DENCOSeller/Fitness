'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { calculateAge } from '@/lib/user-helpers';

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export type CalorieBalance = {
  bmr: number | null;          // Базовый метаболизм (Mifflin-St Jeor или Picooc)
  workoutBurned: number;       // Сожжено за тренировки (формула)
  dailyNorm: number | null;    // BMR × коэффициент активности (- 500 при похудении)
  eaten: number;               // Съедено из записей питания
  remaining: number | null;    // Сколько можно ещё съесть
  deficit: boolean;            // Применён дефицит -500
  goal: string | null;
  activityLevel: string;
};

export async function getCalorieBalance(dateStr?: string): Promise<CalorieBalance> {
  const userId = await getCurrentUserId();
  const date = dateStr
    ? new Date(dateStr + 'T00:00:00')
    : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const [latestBody, user, todayMeals, todayWorkouts] = await Promise.all([
    // Последний замер с весом
    prisma.bodyMetric.findFirst({
      where: { userId, weight: { not: null } },
      orderBy: { date: 'desc' },
      select: { weight: true, bmr: true },
    }),
    // Профиль пользователя
    prisma.user.findUnique({
      where: { id: userId },
      select: { goal: true, targetWeight: true, activityLevel: true, gender: true, height: true, birthDate: true },
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

  // Расчёт BMR по формуле Миффлина-Сан Жеора
  const weight = latestBody?.weight;
  const height = user?.height;
  const age = calculateAge(user?.birthDate);
  const gender = user?.gender;

  let bmr: number | null = null;
  if (weight && height && age) {
    // Mifflin-St Jeor: 10×вес + 6.25×рост - 5×возраст + (5 для мужчин, -161 для женщин)
    const genderOffset = gender === 'female' ? -161 : 5;
    bmr = Math.round(10 * weight + 6.25 * height - 5 * age + genderOffset);
  } else {
    // Fallback: BMR из Picooc если нет данных для формулы
    bmr = latestBody?.bmr ?? null;
  }

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

  // Коэффициент активности
  const activityLevel = user?.activityLevel || 'moderate';
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;

  // Дефицит при похудении
  const isLoss = user?.goal === 'loss';

  // Дневная норма = BMR × коэффициент активности + сожжено на тренировке (- 500 при цели "похудение")
  let dailyNorm: number | null = null;
  if (bmr !== null) {
    dailyNorm = Math.round(bmr * multiplier + workoutBurned - (isLoss ? 500 : 0));
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
    activityLevel,
  };
}
