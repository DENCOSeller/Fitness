import { prisma } from '@/lib/db';
import { EQUIPMENT_CATALOG } from '@/lib/equipment-catalog';

// Flattened catalog for matching
const ALL_EQUIPMENT = EQUIPMENT_CATALOG.flatMap(g =>
  g.items.map(name => ({ name, category: g.category }))
);

// Aliases for natural language matching
const ALIASES: Record<string, string> = {
  'дорожка': 'Беговая дорожка',
  'беговая': 'Беговая дорожка',
  'велик': 'Велотренажёр',
  'вело': 'Велотренажёр',
  'велосипед': 'Велотренажёр',
  'эллипс': 'Эллипсоид',
  'гребля': 'Гребной тренажёр',
  'гребной': 'Гребной тренажёр',
  'гантель': 'Гантели',
  'гантели': 'Гантели',
  'гантелями': 'Гантели',
  'гантелей': 'Гантели',
  'штанга': 'Штанга',
  'штангу': 'Штанга',
  'штангой': 'Штанга',
  'гиря': 'Гири',
  'гири': 'Гири',
  'гирями': 'Гири',
  'гирю': 'Гири',
  'ez': 'EZ-гриф',
  'ez-гриф': 'EZ-гриф',
  'блок': 'Блочный тренажёр',
  'блочный': 'Блочный тренажёр',
  'кроссовер': 'Кроссовер',
  'смит': 'Смит',
  'жим ногами': 'Жим ногами',
  'хаммер': 'Хаммер',
  'турник': 'Турник',
  'перекладина': 'Турник',
  'брусья': 'Брусья',
  'скамья': 'Скамья',
  'скамейка': 'Скамья',
  'лавка': 'Скамья',
  'trx': 'Петли TRX',
  'петли': 'Петли TRX',
  'резинки': 'Резинки',
  'резинка': 'Резинки',
  'эспандер': 'Резинки',
  'ролик': 'Ролик для пресса',
  'римский стул': 'Римский стул',
  'гиперэкстензия': 'Римский стул',
  'скакалка': 'Скакалка',
  'скакалку': 'Скакалка',
};

// Patterns that indicate equipment availability or absence
const HAS_PATTERNS = [
  /у меня (?:есть|имеется)\s+(.+)/i,
  /(?:в зале|дома|в фитнесе|в клубе)\s+(?:есть|имеется|стоит|имеются)\s+(.+)/i,
  /(?:тренируюсь|занимаюсь)\s+(?:с|со)\s+(.+)/i,
  /(?:доступ[а-я]*|использую)\s+(.+)/i,
  /купил[а]?\s+(.+)/i,
];

const NO_PATTERNS = [
  /(?:у меня )?нет\s+(.+)/i,
  /(?:без|не имею|нет доступа к)\s+(.+)/i,
  /не (?:имею|могу использовать)\s+(.+)/i,
];

function findEquipmentInText(text: string): string | null {
  const lower = text.toLowerCase().trim();

  // Check aliases first
  for (const [alias, name] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return name;
  }

  // Check full names
  for (const eq of ALL_EQUIPMENT) {
    if (lower.includes(eq.name.toLowerCase())) return eq.name;
  }

  return null;
}

export interface EquipmentUpdate {
  name: string;
  available: boolean;
}

export async function detectAndSaveEquipment(message: string, userId: number): Promise<EquipmentUpdate[]> {
  const updates: EquipmentUpdate[] = [];
  const seen = new Set<string>();

  // Check "have" patterns
  for (const pattern of HAS_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const fragment = match[1];
      // Split by commas, "и", "+"
      const parts = fragment.split(/[,\+]|\sи\s/).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const name = findEquipmentInText(part);
        if (name && !seen.has(name)) {
          updates.push({ name, available: true });
          seen.add(name);
        }
      }
    }
  }

  // Check "don't have" patterns
  for (const pattern of NO_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const fragment = match[1];
      const parts = fragment.split(/[,\+]|\sи\s/).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const name = findEquipmentInText(part);
        if (name && !seen.has(name)) {
          updates.push({ name, available: false });
          seen.add(name);
        }
      }
    }
  }

  // Save to DB if we found any
  if (updates.length > 0) {
    for (const update of updates) {
      const eq = ALL_EQUIPMENT.find(e => e.name === update.name);
      const category = eq?.category || 'Другое';

      await prisma.userEquipment.upsert({
        where: { userId_name: { userId, name: update.name } },
        update: { available: update.available },
        create: { userId, name: update.name, category, available: update.available },
      });
    }
  }

  return updates;
}
