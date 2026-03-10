import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { getCalorieBalance } from '@/lib/calorie-balance';
import CalorieBalanceWidget from '@/components/dashboard/calorie-balance';
import BodyMetricsWidget from '@/components/dashboard/body-metrics-widget';
import Link from 'next/link';

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatWorkoutDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  if (diff < 7) return `${diff} дн. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const workoutTypeLabels: Record<string, string> = {
  strength: 'Силовая',
  cardio: 'Кардио',
  stretching: 'Растяжка',
  other: 'Другое',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calorieBalance = await getCalorieBalance();

  const [
    latestMetrics,
    previousMetrics,
    lastWorkout,
    todayCheckin,
    user,
  ] = await Promise.all([
    prisma.bodyMetric.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    }),
    prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip: 1,
      take: 1,
    }),
    prisma.workout.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: { setOrder: 'asc' },
        },
      },
    }),
    prisma.checkIn.findFirst({
      where: { userId, date: today },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  const prev = previousMetrics[0] || null;

  // Unique exercises in last workout
  const lastWorkoutExercises = lastWorkout
    ? [...new Map(lastWorkout.sets.map(s => [s.exercise.name, s.exercise])).values()]
    : [];

  // Metric delta helper
  function delta(current: number | null | undefined, previous: number | null | undefined) {
    if (current == null || previous == null) return null;
    return +(current - previous).toFixed(1);
  }

  const weightDelta = delta(latestMetrics?.weight, prev?.weight);
  const fatDelta = delta(latestMetrics?.bodyFatPct, prev?.bodyFatPct);
  const muscleDelta = delta(latestMetrics?.muscleMass, prev?.muscleMass);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Greeting */}
      <div className="pt-1 pb-2">
        <h1 className="text-2xl font-bold">Привет{user?.name ? `, ${user.name}` : ''}!</h1>
        <p className="text-text-secondary text-sm mt-0.5 capitalize">{formatDate(new Date())}</p>
      </div>

      {/* Body Metrics — interactive cards + chart */}
      <BodyMetricsWidget
        initialWeight={latestMetrics?.weight ?? null}
        initialFat={latestMetrics?.bodyFatPct ?? null}
        initialMuscle={latestMetrics?.muscleMass ?? null}
        weightDelta={weightDelta}
        fatDelta={fatDelta}
        muscleDelta={muscleDelta}
      />

      {/* Calorie Balance */}
      <CalorieBalanceWidget data={calorieBalance} />

      {/* Last Workout */}
      <Link href={lastWorkout ? `/workouts/${lastWorkout.id}` : '/workouts/new'} className="block">
        <div className="rounded-2xl bg-card p-4 active:bg-card-hover transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-text-secondary">Последняя тренировка</h2>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
          {lastWorkout ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold">
                  {workoutTypeLabels[lastWorkout.type] || lastWorkout.type}
                </span>
                <span className="text-xs text-text-secondary bg-card-hover px-2 py-0.5 rounded-full">
                  {formatWorkoutDate(lastWorkout.date)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastWorkoutExercises.slice(0, 4).map(ex => (
                  <span key={ex.id} className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-lg">
                    {ex.name}
                  </span>
                ))}
                {lastWorkoutExercises.length > 4 && (
                  <span className="text-xs text-text-secondary px-2 py-1">
                    +{lastWorkoutExercises.length - 4}
                  </span>
                )}
              </div>
              {lastWorkout.durationMin && (
                <p className="text-xs text-text-secondary mt-2">{lastWorkout.durationMin} мин</p>
              )}
            </>
          ) : (
            <p className="text-text-secondary text-sm">Тренировок пока нет</p>
          )}
        </div>
      </Link>

      {/* Today Check-in */}
      {todayCheckin ? (
        <Link href="/checkin" className="block">
          <div className="rounded-2xl bg-card p-4 active:bg-card-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text-secondary">Сегодня</h2>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-text-secondary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <CheckinMetric label="Энергия" value={todayCheckin.energy} emoji="⚡" />
              <CheckinMetric label="Настроение" value={todayCheckin.wellbeing} emoji="😊" />
              <CheckinMetric label="Сон" value={todayCheckin.sleep} emoji="😴" />
              <CheckinMetric label="Стресс" value={todayCheckin.stress} emoji="😤" />
            </div>
          </div>
        </Link>
      ) : (
        <Link href="/checkin" className="block">
          <div className="rounded-2xl bg-card p-4 active:bg-card-hover transition-colors flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-text-secondary">Чек-ин</h2>
              <p className="text-sm mt-1">Как ты себя чувствуешь сегодня?</p>
            </div>
            <div className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-xl">
              Заполнить
            </div>
          </div>
        </Link>
      )}

      {/* AI Trainer Button */}
      <Link href="/ai/trainer" className="block">
        <div className="rounded-2xl bg-gradient-to-r from-accent/20 to-purple-500/20 p-4 active:opacity-80 transition-opacity border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">AI Тренер</p>
              <p className="text-xs text-text-secondary">Спроси совет по тренировке или питанию</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CheckinMetric({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="text-center">
      <p className="text-lg mb-0.5">{emoji}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-text-secondary">{label}</p>
    </div>
  );
}
