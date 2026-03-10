'use server';

import { prisma } from '@/lib/db';
import { deleteImage } from '@/lib/upload';

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
