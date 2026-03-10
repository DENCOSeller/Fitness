'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { askClaudeVision } from '@/lib/claude';
import { buildPicoocPrompt, validatePicoocData } from '@/lib/picooc-prompt';
import type { PicoocData } from '@/lib/picooc-prompt';
import { deleteImage } from '@/lib/upload';
import { buildFullContextBlock } from '@/lib/ai-context';
import fs from 'fs/promises';
import path from 'path';

export async function parseScreenshot(imageBase64: string, mediaType: string): Promise<{
  data?: PicoocData;
  warnings?: string[];
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    const [user, latestMeasurement] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, gender: true, birthDate: true, height: true, goal: true, targetWeight: true, activityLevel: true },
      }),
      prisma.bodyMeasurement.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
    ]);
    const profileContext = buildFullContextBlock(user, null, latestMeasurement);
    const prompt = buildPicoocPrompt(profileContext || undefined);

    const response = await askClaudeVision(
      prompt,
      imageBase64,
      mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    );

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: 'Claude не смог распознать данные со скриншота' };
    }
    jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as PicoocData;
    const warnings = validatePicoocData(parsed);

    return { data: parsed, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (e) {
    console.error('parseScreenshot error:', e);
    return { error: 'Ошибка распознавания скриншота' };
  }
}

export async function saveBodyMetric(data: {
  date: string;
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  bmi: number | null;
  waterPct: number | null;
  leanMass: number | null;
  bmr: number | null;
  metabolicAge: number | null;
  screenshotPath: string | null;
}) {
  const userId = await getCurrentUserId();
  const date = new Date(data.date + 'T00:00:00');

  const metricData = {
    weight: data.weight,
    bodyFatPct: data.bodyFatPct,
    muscleMass: data.muscleMass,
    bmi: data.bmi,
    waterPct: data.waterPct,
    leanMass: data.leanMass,
    bmr: data.bmr,
    metabolicAge: data.metabolicAge,
  };

  // Check if metric exists for this date and user
  const existing = await prisma.bodyMetric.findFirst({
    where: { userId, date },
  });

  if (existing) {
    // Delete old screenshot if replacing
    if (existing.screenshotPath && data.screenshotPath && existing.screenshotPath !== data.screenshotPath) {
      await deleteImage(existing.screenshotPath);
    }

    return prisma.bodyMetric.update({
      where: { id: existing.id },
      data: {
        ...metricData,
        screenshotPath: data.screenshotPath || existing.screenshotPath,
      },
    });
  }

  return prisma.bodyMetric.create({
    data: {
      userId,
      date,
      ...metricData,
      screenshotPath: data.screenshotPath,
    },
  });
}

export async function getBodyMetrics(limit = 90) {
  const userId = await getCurrentUserId();
  return prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

export async function deleteBodyMetric(id: number) {
  const userId = await getCurrentUserId();
  const metric = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!metric || metric.userId !== userId) {
    return { error: 'Замер не найден' };
  }

  if (metric.screenshotPath) {
    await deleteImage(metric.screenshotPath);
  }

  await prisma.bodyMetric.delete({ where: { id } });
  return { success: true };
}

export async function getImageBase64(relativePath: string): Promise<{ base64: string; mediaType: string } | null> {
  await getCurrentUserId();

  // Prevent path traversal
  if (!relativePath.startsWith('/uploads/') || relativePath.includes('..')) {
    return null;
  }

  try {
    const fullPath = path.join('/root/Fitness', 'public', relativePath);
    const buffer = await fs.readFile(fullPath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(relativePath).toLowerCase();
    const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { base64, mediaType };
  } catch {
    return null;
  }
}
