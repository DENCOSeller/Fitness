'use server';

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { buildFullContextBlock } from '@/lib/ai-context';

export async function buildTrainerSystemPrompt(userId?: number): Promise<string> {
  const uid = userId ?? await getCurrentUserId();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch user profile and all data in parallel
  const [user, checkIns, workouts, meals, bodyMetrics, healthDaily, latestMeasurement, systemExercises, userEquipment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { name: true, gender: true, birthDate: true, height: true, goal: true, targetWeight: true, activityLevel: true },
    }),
    prisma.checkIn.findMany({
      where: { userId: uid, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.workout.findMany({
      where: { userId: uid, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      include: { sets: { include: { exercise: true } } },
      take: 20,
    }),
    prisma.meal.findMany({
      where: { userId: uid, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.bodyMetric.findMany({
      where: { userId: uid },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.healthDaily.findMany({
      where: { userId: uid, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.bodyMeasurement.findFirst({
      where: { userId: uid },
      orderBy: { date: 'desc' },
    }),
    prisma.exercise.findMany({
      where: { isSystem: true },
      select: { name: true, muscleGroup: true, description: true, muscleGroups: true, equipment: true, difficulty: true, tips: true },
      orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
    }),
    prisma.userEquipment.findMany({
      where: { userId: uid },
      select: { name: true, category: true, available: true },
    }),
  ]);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Debug: log what was fetched
  console.log('[AI-Trainer] userId:', uid);
  console.log('[AI-Trainer] user:', user?.name, 'height:', user?.height, 'goal:', user?.goal);
  console.log('[AI-Trainer] checkIns:', checkIns.length);
  console.log('[AI-Trainer] workouts:', workouts.length, workouts.map(w => ({ date: fmt(w.date), type: w.type, sets: w.sets.length })));
  console.log('[AI-Trainer] meals:', meals.length);
  console.log('[AI-Trainer] bodyMetrics:', bodyMetrics.length, bodyMetrics.map(b => ({ date: fmt(b.date), weight: b.weight })));
  console.log('[AI-Trainer] healthDaily:', healthDaily.length);
  console.log('[AI-Trainer] exercises catalog:', systemExercises.length);
  console.log('[AI-Trainer] equipment:', userEquipment.length);

  // Build context sections
  const sections: string[] = [];

  // Check-ins
  if (checkIns.length > 0) {
    const lines = checkIns.map(c =>
      `${fmt(c.date)}: самочувствие=${c.wellbeing}/10, сон=${c.sleep}/10, стресс=${c.stress}/10, энергия=${c.energy}/10${c.note ? `, заметка: "${c.note}"` : ''}`
    );
    sections.push(`## Чек-ины (последние ${checkIns.length} дней)\n${lines.join('\n')}`);
  }

  // Workouts
  if (workouts.length > 0) {
    const lines = workouts.map(w => {
      const exercises = w.sets.reduce((acc, s) => {
        const name = s.exercise.name;
        if (!acc[name]) acc[name] = [];
        const exType = s.exercise.type || 'strength';
        if (exType === 'cardio' || exType === 'timed') {
          const parts: string[] = [];
          if (s.duration) parts.push(`${s.duration} мин`);
          if (s.distance) parts.push(`${s.distance} км`);
          if (s.speed) parts.push(`${s.speed} км/ч`);
          if (s.incline) parts.push(`наклон ${s.incline}%`);
          if (s.heartRate) parts.push(`пульс ${s.heartRate}`);
          acc[name].push(parts.join(', ') || 'кардио');
        } else {
          acc[name].push(`${s.reps}×${s.weight}кг`);
        }
        return acc;
      }, {} as Record<string, string[]>);
      const exerciseStr = Object.entries(exercises)
        .map(([name, sets]) => `  ${name}: ${sets.join(', ')}`)
        .join('\n');
      return `${fmt(w.date)} [${w.type}]${w.durationMin ? ` ${w.durationMin}мин` : ''}\n${exerciseStr}${w.note ? `\n  Заметка: ${w.note}` : ''}`;
    });
    sections.push(`## Тренировки (последние ${workouts.length})\n${lines.join('\n\n')}`);
  }

  // Meals
  if (meals.length > 0) {
    const lines = meals.map(m =>
      `${fmt(m.date)} [${m.mealType}]: ${m.description || 'без описания'}${m.aiAnalysis ? ` → AI: ${m.aiAnalysis.substring(0, 200)}` : ''}`
    );
    sections.push(`## Питание (последние ${meals.length} приёмов)\n${lines.join('\n')}`);
  }

  // Body metrics
  if (bodyMetrics.length > 0) {
    const lines = bodyMetrics.map(b => {
      const parts = [`вес=${b.weight}кг`];
      if (b.bodyFatPct) parts.push(`жир=${b.bodyFatPct}%`);
      if (b.muscleMass) parts.push(`мышцы=${b.muscleMass}кг`);
      if (b.bmi) parts.push(`BMI=${b.bmi}`);
      if (b.waterPct) parts.push(`вода=${b.waterPct}%`);
      return `${fmt(b.date)}: ${parts.join(', ')}`;
    });
    sections.push(`## Состав тела (последние ${bodyMetrics.length} замеров)\n${lines.join('\n')}`);
  }

  // Apple Health
  if (healthDaily.length > 0) {
    const lines = healthDaily.map(h => {
      const parts: string[] = [];
      if (h.steps) parts.push(`шаги=${h.steps}`);
      if (h.activeCalories) parts.push(`калории=${h.activeCalories}`);
      if (h.restingHr) parts.push(`пульс покоя=${h.restingHr}`);
      if (h.sleepHours) parts.push(`сон=${h.sleepHours}ч`);
      return `${fmt(h.date)}: ${parts.join(', ')}`;
    });
    sections.push(`## Apple Health (последние ${healthDaily.length} дней)\n${lines.join('\n')}`);
  }

  // System exercises catalog for AI trainer
  if (systemExercises.length > 0) {
    const byGroup = new Map<string, typeof systemExercises>();
    for (const ex of systemExercises) {
      const group = byGroup.get(ex.muscleGroup) || [];
      group.push(ex);
      byGroup.set(ex.muscleGroup, group);
    }
    const lines: string[] = [];
    for (const [group, exs] of byGroup) {
      lines.push(`### ${group}`);
      for (const ex of exs) {
        const parts = [`**${ex.name}**`];
        if (ex.muscleGroups) parts.push(`мышцы: ${ex.muscleGroups}`);
        if (ex.equipment) parts.push(`оборудование: ${ex.equipment}`);
        if (ex.difficulty) parts.push(`уровень: ${ex.difficulty}`);
        if (ex.tips) parts.push(`совет: ${ex.tips}`);
        lines.push(parts.join(' | '));
      }
    }
    sections.push(`## Каталог упражнений (${systemExercises.length} шт.)\nИспользуй эти упражнения при составлении программ тренировок.\n${lines.join('\n')}`);
  }

  // User equipment
  if (userEquipment.length > 0) {
    const available = userEquipment.filter(e => e.available);
    const unavailable = userEquipment.filter(e => !e.available);
    if (available.length > 0) {
      const byCategory = new Map<string, string[]>();
      for (const eq of available) {
        const list = byCategory.get(eq.category) || [];
        list.push(eq.name);
        byCategory.set(eq.category, list);
      }
      const lines = Array.from(byCategory.entries()).map(([cat, items]) => `${cat}: ${items.join(', ')}`);
      sections.push(`## Доступное оборудование\nСоставляй программы ТОЛЬКО с этим оборудованием.\n${lines.join('\n')}`);
    }
    if (unavailable.length > 0) {
      sections.push(`## Недоступное оборудование\nНЕ используй: ${unavailable.map(e => e.name).join(', ')}`);
    }
  }

  // User profile + body measurements + latest Picooc
  const latestPicooc = bodyMetrics.length > 0 ? bodyMetrics[0] : null;
  const profileBlock = buildFullContextBlock(user, latestPicooc, latestMeasurement);
  if (profileBlock) {
    sections.unshift(`## Профиль\n${profileBlock}`);
  }

  const context = sections.length > 0
    ? sections.join('\n\n')
    : 'Данных пока нет. Пользователь только начал использовать трекер.';

  // Debug: log final context size
  console.log('[AI-Trainer] context sections:', sections.length, 'total chars:', context.length);

  return `Ты — персональный фитнес-тренер в приложении DENCO Health. Твоё имя — DENCO Тренер.

ВАЖНО: У тебя ЕСТЬ полный доступ к истории тренировок, питания, замеров тела и чек-инов пользователя. Все данные приведены ниже в разделе "Данные пользователя". ОБЯЗАТЕЛЬНО используй эти данные при ответах — ссылайся на конкретные тренировки, веса, даты, упражнения. Никогда не говори что у тебя нет доступа к данным, если они указаны ниже.

Твои задачи:
- Давать персональные советы по тренировкам, питанию, восстановлению
- Анализировать данные пользователя и замечать тренды
- Мотивировать и поддерживать
- Отвечать на вопросы о фитнесе и здоровье
- Составлять программы тренировок при запросе

Правила:
- Отвечай на русском языке
- Будь конкретным — используй данные пользователя в ответах, ссылайся на конкретные цифры и даты
- Не выдумывай данные, которых нет в контексте
- Если данных мало, скажи об этом и дай общие рекомендации
- Будь дружелюбным, но профессиональным
- Ответы не длиннее 300 слов, если не просят подробнее
- Используй форматирование: **жирный**, списки, эмодзи умеренно
- Когда составляешь план тренировки:
  1. ОБЯЗАТЕЛЬНО вызови инструмент create_workout_plan со структурированными данными
  2. Помимо вызова инструмента, опиши план текстом для пользователя (формат списка, НЕ таблицы)
  3. Используй ТОЛЬКО названия упражнений из каталога (раздел "Каталог упражнений")
  4. Указывай рекомендуемое время отдыха (rest_seconds): 60-90с для лёгких, 120-180с для тяжёлых
  5. ОБЯЗАТЕЛЬНО указывай type для КАЖДОГО упражнения:
     - strength: силовые со штангой/гантелями → reps + weight_kg (на основе истории или начальный вес)
     - bodyweight: отжимания/подтягивания/выпады без веса → reps (weight_kg только если утяжелитель)
     - cardio: бег/велосипед/дорожка/гребля → duration_min + speed_kmh/distance_km/incline_pct
     - timed: планка/растяжка/вис/стенка → duration_min (в минутах, напр. 0.5 для 30 сек)
  6. НЕ указывай reps/weight_kg для cardio и timed. НЕ указывай duration_min для strength и bodyweight.

Сегодня: ${fmt(now)}

# Данные пользователя

${context}`;
}

export async function getChatHistory(sessionId: string, userId?: number) {
  const uid = userId ?? await getCurrentUserId();
  return prisma.chatMessage.findMany({
    where: { userId: uid, sessionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  });
}

export async function saveChatMessage(sessionId: string, role: string, content: string, userId?: number) {
  const uid = userId ?? await getCurrentUserId();
  return prisma.chatMessage.create({
    data: { userId: uid, sessionId, role, content },
  });
}

export async function getChatSessions(userId?: number) {
  const uid = userId ?? await getCurrentUserId();
  // Get distinct sessions with their first message and message count
  const sessions = await prisma.$queryRaw<
    { session_id: string; first_message: string; created_at: Date; message_count: bigint }[]
  >`
    SELECT session_id,
           (SELECT content FROM chat_messages cm2 WHERE cm2.session_id = cm.session_id AND cm2.role = 'user' AND cm2.user_id = ${uid} ORDER BY created_at ASC LIMIT 1) as first_message,
           MIN(created_at) as created_at,
           COUNT(*) as message_count
    FROM chat_messages cm
    WHERE cm.user_id = ${uid}
    GROUP BY session_id
    ORDER BY MAX(created_at) DESC
    LIMIT 20
  `;

  return sessions.map(s => ({
    sessionId: s.session_id,
    firstMessage: s.first_message?.substring(0, 80) || 'Новый чат',
    createdAt: s.created_at,
    messageCount: Number(s.message_count),
  }));
}

export async function deleteChatSession(sessionId: string, userId?: number) {
  const uid = userId ?? await getCurrentUserId();
  await prisma.chatMessage.deleteMany({ where: { userId: uid, sessionId } });
}
