'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { deleteImage } from '@/lib/upload';
import { askClaudeVision } from '@/lib/claude';
import { buildMealAnalysisPrompt } from '@/lib/ai-prompts';
import fs from 'fs/promises';
import path from 'path';

export async function createMeal(data: {
  date: string;
  mealType: string;
  description?: string;
  photoPath?: string;
  note?: string;
  calories?: number;
}) {
  const userId = await getCurrentUserId();
  const date = new Date(data.date + 'T00:00:00');

  return prisma.meal.create({
    data: {
      userId,
      date,
      mealType: data.mealType,
      description: data.description || null,
      photoPath: data.photoPath || null,
      note: data.note || null,
      calories: data.calories ?? null,
    },
  });
}

export async function getMealsByDate(dateStr: string) {
  const userId = await getCurrentUserId();
  const date = new Date(dateStr + 'T00:00:00');

  return prisma.meal.findMany({
    where: { userId, date },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteMeal(id: number) {
  const userId = await getCurrentUserId();
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== userId) {
    return { error: 'Приём пищи не найден' };
  }

  // Delete photo from disk if exists
  if (meal.photoPath) {
    await deleteImage(meal.photoPath);
  }

  await prisma.meal.delete({ where: { id } });
  return { success: true };
}

export async function getDailyCalorieSummary(dateStr: string) {
  const userId = await getCurrentUserId();
  const date = new Date(dateStr + 'T00:00:00');

  const meals = await prisma.meal.findMany({
    where: { userId, date },
    select: { calories: true, mealType: true },
  });

  const total = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const count = meals.filter(m => m.calories !== null).length;

  return { total, count, mealsCount: meals.length };
}

export async function analyzeMeal(id: number) {
  const userId = await getCurrentUserId();
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== userId) {
    return { error: 'Приём пищи не найден' };
  }
  if (!meal.photoPath) {
    return { error: 'У этого приёма нет фото для анализа' };
  }

  // Read photo from disk and convert to base64
  const fullPath = path.join('/root/Fitness', 'public', meal.photoPath);
  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(fullPath);
  } catch {
    return { error: 'Фото не найдено на диске' };
  }

  const imageBase64 = imageBuffer.toString('base64');
  const prompt = buildMealAnalysisPrompt(meal.description);

  try {
    const result = await askClaudeVision(prompt, imageBase64, 'image/jpeg');

    // Parse JSON response
    let parsed: {
      dishes?: string;
      calories?: number;
      protein?: number;
      fat?: number;
      carbs?: number;
      comment?: string;
      error?: string;
    };
    try {
      parsed = JSON.parse(result);
    } catch {
      return { error: 'Не удалось разобрать ответ AI' };
    }

    if (parsed.error) {
      return { error: parsed.error };
    }

    // Format analysis text for storage
    const analysisText = [
      parsed.dishes,
      `${parsed.calories} ккал | Б: ${parsed.protein}г | Ж: ${parsed.fat}г | У: ${parsed.carbs}г`,
      parsed.comment,
    ].filter(Boolean).join('\n');

    // Save to DB
    await prisma.meal.update({
      where: { id },
      data: {
        aiAnalysis: analysisText,
        calories: parsed.calories ? Math.round(parsed.calories) : null,
      },
    });

    return { success: true, analysis: analysisText };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка AI анализа';
    return { error: message };
  }
}
