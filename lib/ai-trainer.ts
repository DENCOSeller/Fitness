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
  const [user, checkIns, workouts, meals, bodyMetrics, healthDaily, latestMeasurement, systemExercises] = await Promise.all([
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
  ]);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

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
        acc[name].push(`${s.reps}×${s.weight}кг`);
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

  // User profile + body measurements + latest Picooc
  const latestPicooc = bodyMetrics.length > 0 ? bodyMetrics[0] : null;
  const profileBlock = buildFullContextBlock(user, latestPicooc, latestMeasurement);
  if (profileBlock) {
    sections.unshift(`## Профиль\n${profileBlock}`);
  }

  const context = sections.length > 0
    ? sections.join('\n\n')
    : 'Данных пока нет. Пользователь только начал использовать трекер.';

  return `Ты — персональный фитнес-тренер в приложении DENCO Health. Твоё имя — DENCO Тренер.

Твои задачи:
- Давать персональные советы по тренировкам, питанию, восстановлению
- Анализировать данные пользователя и замечать тренды
- Мотивировать и поддерживать
- Отвечать на вопросы о фитнесе и здоровье
- Составлять программы тренировок при запросе

Правила:
- Отвечай на русском языке
- Будь конкретным — используй данные пользователя в ответах
- Не выдумывай данные, которых нет в контексте
- Если данных мало, скажи об этом и дай общие рекомендации
- Будь дружелюбным, но профессиональным
- Ответы не длиннее 300 слов, если не просят подробнее
- Используй форматирование: **жирный**, списки, эмодзи умеренно

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
