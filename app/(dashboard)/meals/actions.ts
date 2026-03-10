'use server';

import { prisma } from '@/lib/db';
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
}) {
  const date = new Date(data.date + 'T00:00:00');

  return prisma.meal.create({
    data: {
      date,
      mealType: data.mealType,
      description: data.description || null,
      photoPath: data.photoPath || null,
      note: data.note || null,
    },
  });
}

export async function getMealsByDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');

  return prisma.meal.findMany({
    where: { date },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteMeal(id: number) {
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal) {
    return { error: 'Приём пищи не найден' };
  }

  // Delete photo from disk if exists
  if (meal.photoPath) {
    await deleteImage(meal.photoPath);
  }

  await prisma.meal.delete({ where: { id } });
  return { success: true };
}

export async function analyzeMeal(id: number) {
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal) {
    return { error: 'Приём пищи не найден' };
  }
  if (!meal.photoPath) {
    return { error: 'У этого приёма нет фото для анализа' };
  }

  // Read photo from disk and convert to base64
  const fullPath = path.join(process.cwd(), 'public', meal.photoPath);
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
      data: { aiAnalysis: analysisText },
    });

    return { success: true, analysis: analysisText };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка AI анализа';
    return { error: message };
  }
}
