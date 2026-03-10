'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { EQUIPMENT_CATALOG } from '@/lib/equipment-catalog';
import type { EquipmentItem } from '@/lib/equipment-catalog';

export async function getUserEquipment(): Promise<EquipmentItem[]> {
  const userId = await getCurrentUserId();
  const rows = await prisma.userEquipment.findMany({
    where: { userId },
    select: { name: true, category: true, available: true },
  });

  // Build full list: merge saved with catalog defaults
  const saved = new Map(rows.map(r => [r.name, r]));
  const result: EquipmentItem[] = [];

  for (const group of EQUIPMENT_CATALOG) {
    for (const item of group.items) {
      const existing = saved.get(item);
      result.push({
        name: item,
        category: group.category,
        available: existing ? existing.available : false,
      });
    }
  }

  return result;
}

export async function toggleEquipment(name: string, available: boolean) {
  const userId = await getCurrentUserId();

  // Find category
  let category = 'Другое';
  for (const group of EQUIPMENT_CATALOG) {
    if ((group.items as readonly string[]).includes(name)) {
      category = group.category;
      break;
    }
  }

  await prisma.userEquipment.upsert({
    where: { userId_name: { userId, name } },
    update: { available },
    create: { userId, name, category, available },
  });

  return { success: true };
}
