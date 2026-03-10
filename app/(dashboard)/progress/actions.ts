'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { deleteImage } from '@/lib/upload';
import { askClaudeVision, askClaudeVisionTwo } from '@/lib/claude';
import { buildProgressPhotoPrompt, buildProgressComparePrompt } from '@/lib/ai-prompts';
import fs from 'fs/promises';
import path from 'path';

export async function uploadProgressPhoto(data: {
  date: string;
  photoPath: string;
}) {
  const userId = await getCurrentUserId();
  const date = new Date(data.date + 'T00:00:00');

  // Check if photo already exists for this date and user — replace it
  const existing = await prisma.progressPhoto.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) {
    await deleteImage(existing.photoPath);
    return prisma.progressPhoto.update({
      where: { id: existing.id },
      data: {
        photoPath: data.photoPath,
        aiAnalysis: null,
      },
    });
  }

  return prisma.progressPhoto.create({
    data: {
      userId,
      date,
      photoPath: data.photoPath,
    },
  });
}

export async function getProgressPhotos() {
  const userId = await getCurrentUserId();
  return prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });
}

export async function getProgressPhotoByDate(dateStr: string) {
  const userId = await getCurrentUserId();
  const date = new Date(dateStr + 'T00:00:00');
  return prisma.progressPhoto.findUnique({
    where: { userId_date: { userId, date } },
  });
}

export async function deleteProgressPhoto(id: number) {
  const userId = await getCurrentUserId();
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo || photo.userId !== userId) {
    return { error: 'Фото не найдено' };
  }

  await deleteImage(photo.photoPath);
  await prisma.progressPhoto.delete({ where: { id } });
  return { success: true };
}

export async function analyzeProgressPhoto(id: number) {
  const userId = await getCurrentUserId();
  const [photo, user] = await Promise.all([
    prisma.progressPhoto.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: userId }, select: { age: true, height: true, goal: true, targetWeight: true } }),
  ]);
  if (!photo || photo.userId !== userId) {
    return { error: 'Фото не найдено' };
  }

  const fullPath = path.join('/root/Fitness', 'public', photo.photoPath);
  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(fullPath);
  } catch {
    return { error: 'Фото не найдено на диске' };
  }

  const imageBase64 = imageBuffer.toString('base64');
  const prompt = buildProgressPhotoPrompt(user || undefined);

  try {
    const result = await askClaudeVision(prompt, imageBase64, 'image/jpeg');

    await prisma.progressPhoto.update({
      where: { id },
      data: { aiAnalysis: result },
    });

    return { success: true, analysis: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка AI анализа';
    return { error: message };
  }
}

export async function compareProgressPhotos(id1: number, id2: number) {
  const userId = await getCurrentUserId();
  const [photo1, photo2, user] = await Promise.all([
    prisma.progressPhoto.findUnique({ where: { id: id1 } }),
    prisma.progressPhoto.findUnique({ where: { id: id2 } }),
    prisma.user.findUnique({ where: { id: userId }, select: { age: true, height: true, goal: true, targetWeight: true } }),
  ]);

  if (!photo1 || !photo2 || photo1.userId !== userId || photo2.userId !== userId) {
    return { error: 'Одно или оба фото не найдены' };
  }

  const [buf1, buf2] = await Promise.all([
    fs.readFile(path.join('/root/Fitness', 'public', photo1.photoPath)).catch(() => null),
    fs.readFile(path.join('/root/Fitness', 'public', photo2.photoPath)).catch(() => null),
  ]);

  if (!buf1 || !buf2) {
    return { error: 'Фото не найдены на диске' };
  }

  const date1 = new Date(photo1.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const date2 = new Date(photo2.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const prompt = buildProgressComparePrompt(date1, date2, user || undefined);

  try {
    const result = await askClaudeVisionTwo(
      prompt,
      buf1.toString('base64'),
      buf2.toString('base64'),
      'image/jpeg'
    );

    return { success: true, comparison: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка AI сравнения';
    return { error: message };
  }
}
