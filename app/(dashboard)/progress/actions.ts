'use server';

import { prisma } from '@/lib/db';
import { deleteImage } from '@/lib/upload';
import { askClaudeVision, askClaudeVisionTwo } from '@/lib/claude';
import { buildProgressPhotoPrompt, buildProgressComparePrompt } from '@/lib/ai-prompts';
import fs from 'fs/promises';
import path from 'path';

export async function uploadProgressPhoto(data: {
  date: string;
  photoPath: string;
}) {
  const date = new Date(data.date + 'T00:00:00');

  // Check if photo already exists for this date — replace it
  const existing = await prisma.progressPhoto.findUnique({ where: { date } });
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
      date,
      photoPath: data.photoPath,
    },
  });
}

export async function getProgressPhotos() {
  return prisma.progressPhoto.findMany({
    orderBy: { date: 'desc' },
  });
}

export async function getProgressPhotoByDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return prisma.progressPhoto.findUnique({ where: { date } });
}

export async function deleteProgressPhoto(id: number) {
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo) {
    return { error: 'Фото не найдено' };
  }

  await deleteImage(photo.photoPath);
  await prisma.progressPhoto.delete({ where: { id } });
  return { success: true };
}

export async function analyzeProgressPhoto(id: number) {
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo) {
    return { error: 'Фото не найдено' };
  }

  const fullPath = path.join(process.cwd(), 'public', photo.photoPath);
  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(fullPath);
  } catch {
    return { error: 'Фото не найдено на диске' };
  }

  const imageBase64 = imageBuffer.toString('base64');
  const prompt = buildProgressPhotoPrompt();

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
  const [photo1, photo2] = await Promise.all([
    prisma.progressPhoto.findUnique({ where: { id: id1 } }),
    prisma.progressPhoto.findUnique({ where: { id: id2 } }),
  ]);

  if (!photo1 || !photo2) {
    return { error: 'Одно или оба фото не найдены' };
  }

  const [buf1, buf2] = await Promise.all([
    fs.readFile(path.join(process.cwd(), 'public', photo1.photoPath)).catch(() => null),
    fs.readFile(path.join(process.cwd(), 'public', photo2.photoPath)).catch(() => null),
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

  const prompt = buildProgressComparePrompt(date1, date2);

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
