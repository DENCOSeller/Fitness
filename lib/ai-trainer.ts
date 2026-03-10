'use server';

import { prisma } from '@/lib/db';

export async function buildTrainerSystemPrompt(): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all user data in parallel
  const [checkIns, workouts, meals, bodyMetrics, healthDaily] = await Promise.all([
    prisma.checkIn.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.workout.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      include: { sets: { include: { exercise: true } } },
      take: 20,
    }),
    prisma.meal.findMany({
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.bodyMetric.findMany({
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.healthDaily.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 30,
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

export async function getChatHistory(sessionId: string) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  });
}

export async function saveChatMessage(sessionId: string, role: string, content: string) {
  return prisma.chatMessage.create({
    data: { sessionId, role, content },
  });
}

export async function getChatSessions() {
  // Get distinct sessions with their first message and message count
  const sessions = await prisma.$queryRaw<
    { session_id: string; first_message: string; created_at: Date; message_count: bigint }[]
  >`
    SELECT session_id,
           (SELECT content FROM chat_messages cm2 WHERE cm2.session_id = cm.session_id AND cm2.role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message,
           MIN(created_at) as created_at,
           COUNT(*) as message_count
    FROM chat_messages cm
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

export async function deleteChatSession(sessionId: string) {
  await prisma.chatMessage.deleteMany({ where: { sessionId } });
}
