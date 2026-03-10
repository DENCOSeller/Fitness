'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { askClaude } from '@/lib/claude';
import { buildDailyPrompt, buildWeeklyPrompt, type DailyContext, type WeeklyContext } from '@/lib/ai-prompts';

export async function getDailyInsight() {
  const userId = await getCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check cache
  const cached = await prisma.aiInsight.findFirst({
    where: { userId, date: today, type: 'daily' },
  });

  if (cached) {
    return {
      content: cached.content,
      cached: true,
      date: cached.date,
      model: cached.model,
    };
  }

  return null;
}

export async function generateDailyInsight() {
  const userId = await getCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Double-check cache
  const cached = await prisma.aiInsight.findFirst({
    where: { userId, date: today, type: 'daily' },
  });
  if (cached) {
    return {
      content: cached.content,
      cached: true,
      date: cached.date,
      model: cached.model,
    };
  }

  // Gather last 7 days of data
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const [user, checkIns, workouts, body, meals, health] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, height: true, goal: true, targetWeight: true },
    }),
    prisma.checkIn.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
      include: {
        sets: {
          include: { exercise: true },
        },
      },
    }),
    prisma.bodyMetric.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
  ]);

  const ctx: DailyContext = {
    profile: user || undefined,
    checkIns: checkIns.map((c) => ({
      date: c.date,
      wellbeing: c.wellbeing,
      sleep: c.sleep,
      stress: c.stress,
      energy: c.energy,
      note: c.note,
    })),
    workouts: workouts.map((w) => ({
      date: w.date,
      type: w.type,
      durationMin: w.durationMin,
      note: w.note,
      sets: w.sets.map((s) => ({
        exerciseName: s.exercise.name,
        reps: s.reps,
        weight: s.weight,
      })),
    })),
    body: body.map((b) => ({
      date: b.date,
      weight: b.weight ? Number(b.weight) : null,
      bodyFatPct: b.bodyFatPct ? Number(b.bodyFatPct) : null,
      muscleMass: b.muscleMass ? Number(b.muscleMass) : null,
    })),
    meals: meals.map((m) => ({
      date: m.date,
      mealType: m.mealType,
      description: m.description,
      aiAnalysis: m.aiAnalysis,
    })),
    health: health.map((h) => ({
      date: h.date,
      steps: h.steps,
      activeCalories: h.activeCalories,
      restingHr: h.restingHr,
      sleepHours: h.sleepHours ? Number(h.sleepHours) : null,
    })),
  };

  const prompt = buildDailyPrompt(ctx);

  try {
    const content = await askClaude(prompt, 'claude-sonnet-4-6');

    const saved = await prisma.aiInsight.create({
      data: {
        userId,
        date: today,
        type: 'daily',
        model: 'claude-sonnet-4-6',
        content,
      },
    });

    return {
      content: saved.content,
      cached: false,
      date: saved.date,
      model: saved.model,
    };
  } catch (e) {
    console.error('generateDailyInsight error:', e);
    return { error: 'Не удалось получить рекомендацию. Попробуйте позже.' };
  }
}

export async function getWeeklyReport() {
  const userId = await getCurrentUserId();
  // Weekly report is cached for 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const cached = await prisma.aiInsight.findFirst({
    where: {
      userId,
      type: 'weekly',
      createdAt: { gte: weekAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return {
      content: cached.content,
      cached: true,
      date: cached.date,
      model: cached.model,
      createdAt: cached.createdAt,
    };
  }

  return null;
}

export async function generateWeeklyReport() {
  const userId = await getCurrentUserId();
  // Check cache (7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const cached = await prisma.aiInsight.findFirst({
    where: {
      userId,
      type: 'weekly',
      createdAt: { gte: weekAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return {
      content: cached.content,
      cached: true,
      date: cached.date,
      model: cached.model,
      createdAt: cached.createdAt,
    };
  }

  // Gather 7 days of data
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const [userProfile, checkIns, workouts, body, meals, health] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, height: true, goal: true, targetWeight: true },
    }),
    prisma.checkIn.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
      include: {
        sets: {
          include: { exercise: true },
        },
      },
    }),
    prisma.bodyMetric.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
  ]);

  const ctx: WeeklyContext = {
    profile: userProfile || undefined,
    checkIns: checkIns.map((c) => ({
      date: c.date,
      wellbeing: c.wellbeing,
      sleep: c.sleep,
      stress: c.stress,
      energy: c.energy,
      note: c.note,
    })),
    workouts: workouts.map((w) => ({
      date: w.date,
      type: w.type,
      durationMin: w.durationMin,
      note: w.note,
      sets: w.sets.map((s) => ({
        exerciseName: s.exercise.name,
        reps: s.reps,
        weight: s.weight,
      })),
    })),
    body: body.map((b) => ({
      date: b.date,
      weight: b.weight ? Number(b.weight) : null,
      bodyFatPct: b.bodyFatPct ? Number(b.bodyFatPct) : null,
      muscleMass: b.muscleMass ? Number(b.muscleMass) : null,
    })),
    meals: meals.map((m) => ({
      date: m.date,
      mealType: m.mealType,
      description: m.description,
      aiAnalysis: m.aiAnalysis,
    })),
    health: health.map((h) => ({
      date: h.date,
      steps: h.steps,
      activeCalories: h.activeCalories,
      restingHr: h.restingHr,
      sleepHours: h.sleepHours ? Number(h.sleepHours) : null,
    })),
  };

  const prompt = buildWeeklyPrompt(ctx);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const content = await askClaude(prompt, 'claude-opus-4-6', 2048);

    const saved = await prisma.aiInsight.create({
      data: {
        userId,
        date: today,
        type: 'weekly',
        model: 'claude-opus-4-6',
        content,
      },
    });

    return {
      content: saved.content,
      cached: false,
      date: saved.date,
      model: saved.model,
      createdAt: saved.createdAt,
    };
  } catch (e) {
    console.error('generateWeeklyReport error:', e);
    return { error: 'Не удалось сгенерировать отчёт. Попробуйте позже.' };
  }
}

export async function getInsightHistory(limit = 30, type?: string) {
  const userId = await getCurrentUserId();
  return prisma.aiInsight.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { date: 'desc' },
    take: limit,
  });
}
