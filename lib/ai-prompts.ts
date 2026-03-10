interface CheckInData {
  date: Date;
  wellbeing: number;
  sleep: number;
  stress: number;
  energy: number;
  note: string | null;
}

interface WorkoutData {
  date: Date;
  type: string;
  durationMin: number | null;
  note: string | null;
  sets: { exerciseName: string; reps: number; weight: number }[];
}

interface BodyData {
  date: Date;
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
}

interface MealData {
  date: Date;
  mealType: string;
  description: string | null;
  aiAnalysis: string | null;
}

interface HealthData {
  date: Date;
  steps: number | null;
  activeCalories: number | null;
  restingHr: number | null;
  sleepHours: number | null;
}

export interface UserProfile {
  name?: string | null;
  age?: number | null;
  birthDate?: Date | string | null;
  height?: number | null;
  goal?: string | null;
  targetWeight?: number | null;
}

export interface DailyContext {
  checkIns: CheckInData[];
  workouts: WorkoutData[];
  body: BodyData[];
  meals: MealData[];
  health: HealthData[];
  profile?: UserProfile;
}

export function buildDailyPrompt(ctx: DailyContext): string {
  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sections: string[] = [];

  // User profile
  const goalLabels: Record<string, string> = { loss: 'похудение', gain: 'набор массы', maintain: 'поддержание формы' };
  if (ctx.profile) {
    const p = ctx.profile;
    const parts: string[] = [];
    const age = p.age ?? (p.birthDate ? (() => { const bd = typeof p.birthDate === 'string' ? new Date(p.birthDate) : p.birthDate; const today = new Date(); let a = today.getFullYear() - bd.getFullYear(); const m = today.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--; return a > 0 && a < 150 ? a : null; })() : null);
    if (age) parts.push(`возраст: ${age} лет`);
    if (p.height) parts.push(`рост: ${p.height} см`);
    if (p.goal) parts.push(`цель: ${goalLabels[p.goal] || p.goal}`);
    if (p.targetWeight) parts.push(`целевой вес: ${p.targetWeight} кг`);
    if (parts.length > 0) {
      sections.push(`Профиль пользователя: ${parts.join(', ')}`);
    }
  }

  // Check-ins
  if (ctx.checkIns.length > 0) {
    const rows = ctx.checkIns.map((c) => {
      const d = new Date(c.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      return `  ${d}: самочувствие=${c.wellbeing}, сон=${c.sleep}, стресс=${c.stress}, энергия=${c.energy}${c.note ? `, заметка: "${c.note}"` : ''}`;
    });
    sections.push(`Чек-ины (самочувствие/сон/стресс/энергия по 10-балльной шкале):\n${rows.join('\n')}`);
  }

  // Workouts
  if (ctx.workouts.length > 0) {
    const rows = ctx.workouts.map((w) => {
      const d = new Date(w.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const exercises = w.sets.length > 0
        ? w.sets.map((s) => `${s.exerciseName} ${s.reps}×${s.weight}кг`).join(', ')
        : 'без упражнений';
      return `  ${d}: ${w.type}${w.durationMin ? `, ${w.durationMin} мин` : ''} — ${exercises}`;
    });
    sections.push(`Тренировки:\n${rows.join('\n')}`);
  }

  // Body metrics
  if (ctx.body.length > 0) {
    const rows = ctx.body.map((b) => {
      const d = new Date(b.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const parts: string[] = [];
      if (b.weight != null) parts.push(`вес=${b.weight}кг`);
      if (b.bodyFatPct != null) parts.push(`жир=${b.bodyFatPct}%`);
      if (b.muscleMass != null) parts.push(`мышцы=${b.muscleMass}%`);
      return `  ${d}: ${parts.join(', ')}`;
    });
    sections.push(`Тело:\n${rows.join('\n')}`);
  }

  // Meals
  if (ctx.meals.length > 0) {
    const rows = ctx.meals.map((m) => {
      const d = new Date(m.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      return `  ${d}: ${m.mealType}${m.description ? ` — ${m.description}` : ''}${m.aiAnalysis ? ` (AI: ${m.aiAnalysis})` : ''}`;
    });
    sections.push(`Питание:\n${rows.join('\n')}`);
  }

  // Health (Apple Watch)
  if (ctx.health.length > 0) {
    const rows = ctx.health.map((h) => {
      const d = new Date(h.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const parts: string[] = [];
      if (h.steps != null) parts.push(`шаги=${h.steps}`);
      if (h.activeCalories != null) parts.push(`ккал=${h.activeCalories}`);
      if (h.restingHr != null) parts.push(`пульс=${h.restingHr}`);
      if (h.sleepHours != null) parts.push(`сон=${h.sleepHours}ч`);
      return `  ${d}: ${parts.join(', ')}`;
    });
    sections.push(`Apple Health:\n${rows.join('\n')}`);
  }

  const dataBlock = sections.length > 0
    ? sections.join('\n\n')
    : 'Данных пока нет.';

  return `Ты — персональный health-коуч. Сегодня ${today}.

Вот данные пользователя за последние 7 дней:

${dataBlock}

На основе этих данных дай краткий персональный совет на сегодня. Формат:

1. **Общая оценка** — как дела по данным (1-2 предложения)
2. **Тренировка** — что стоит сделать сегодня (учитывай нагрузку за последние дни, уровень стресса и сон)
3. **Восстановление** — советы по сну, стрессу, отдыху (если нужно)
4. **Питание** — краткие рекомендации (если есть данные)

Будь конкретным и практичным. Не повторяй данные — анализируй тренды. Пиши на русском, кратко (до 300 слов).`;
}

export function buildMealAnalysisPrompt(description?: string | null): string {
  let prompt = `Ты — опытный нутрициолог. Проанализируй фото приёма пищи.

Определи:
1. Какие блюда/продукты на фото
2. Примерный размер порции
3. Приблизительный состав на всю порцию:
   - Калории (ккал)
   - Белки (г)
   - Жиры (г)
   - Углеводы (г)`;

  if (description) {
    prompt += `\n\nПользователь описал еду: "${description}"`;
  }

  prompt += `

Ответь строго в формате JSON (без markdown, без \`\`\`):
{
  "dishes": "перечисление блюд через запятую",
  "calories": число,
  "protein": число,
  "fat": число,
  "carbs": число,
  "comment": "краткий комментарий по питательности (1-2 предложения)"
}

Если на фото не еда — верни:
{"error": "На фото не удалось распознать еду"}`;

  return prompt;
}

export function buildProgressPhotoPrompt(profile?: { age?: number | null; birthDate?: Date | string | null; height?: number | null; goal?: string | null; targetWeight?: number | null }): string {
  const goalLabels: Record<string, string> = { loss: 'похудение', gain: 'набор массы', maintain: 'поддержание формы' };
  const profileLines: string[] = [];
  const photoAge = profile?.age ?? (profile?.birthDate ? (() => { const bd = typeof profile.birthDate === 'string' ? new Date(profile.birthDate) : profile.birthDate; const today = new Date(); let a = today.getFullYear() - bd.getFullYear(); const m = today.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--; return a > 0 && a < 150 ? a : null; })() : null);
  if (photoAge) profileLines.push(`Возраст: ${photoAge} лет`);
  if (profile?.height) profileLines.push(`Рост: ${profile.height} см`);
  if (profile?.goal) profileLines.push(`Цель: ${goalLabels[profile.goal] || profile.goal}`);
  if (profile?.targetWeight) profileLines.push(`Целевой вес: ${profile.targetWeight} кг`);
  const profileBlock = profileLines.length > 0 ? `\n\nДанные пользователя:\n${profileLines.join('\n')}` : '';

  return `Ты — опытный фитнес-тренер и эксперт по телосложению. Проанализируй фото прогресса тела.${profileBlock}

Оцени:
1. **Общее впечатление** — телосложение, пропорции, видимый тонус мышц
2. **Сильные стороны** — какие группы мышц выглядят хорошо развитыми
3. **Зоны для улучшения** — над чем стоит поработать
4. **Рекомендации** — конкретные советы по тренировкам и питанию для улучшения формы${profile?.goal ? ` (с учётом цели: ${goalLabels[profile.goal] || profile.goal})` : ''}

Будь честным, но мотивирующим. Пиши на русском, кратко (до 200 слов).
Если на фото не тело/фигура человека — напиши: "На фото не удалось распознать фигуру для анализа."`;
}

export function buildProgressComparePrompt(date1: string, date2: string, profile?: { age?: number | null; birthDate?: Date | string | null; height?: number | null; goal?: string | null; targetWeight?: number | null }): string {
  const goalLabels: Record<string, string> = { loss: 'похудение', gain: 'набор массы', maintain: 'поддержание формы' };
  const profileLines: string[] = [];
  const compareAge = profile?.age ?? (profile?.birthDate ? (() => { const bd = typeof profile.birthDate === 'string' ? new Date(profile.birthDate) : profile.birthDate; const today = new Date(); let a = today.getFullYear() - bd.getFullYear(); const m = today.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--; return a > 0 && a < 150 ? a : null; })() : null);
  if (compareAge) profileLines.push(`Возраст: ${compareAge} лет`);
  if (profile?.height) profileLines.push(`Рост: ${profile.height} см`);
  if (profile?.goal) profileLines.push(`Цель: ${goalLabels[profile.goal] || profile.goal}`);
  if (profile?.targetWeight) profileLines.push(`Целевой вес: ${profile.targetWeight} кг`);
  const profileBlock = profileLines.length > 0 ? `\n\nДанные пользователя:\n${profileLines.join('\n')}` : '';

  return `Ты — опытный фитнес-тренер. Перед тобой два фото прогресса тела одного человека.${profileBlock}

Первое фото — от ${date1}.
Второе фото — от ${date2}.

Сравни два фото и оцени:
1. **Видимые изменения** — что изменилось между фото (объём мышц, рельеф, жировая прослойка, пропорции)
2. **Прогресс** — есть ли положительная динамика, в каких зонах
3. **Рекомендации** — что делать дальше для продолжения прогресса${profile?.goal ? ` (с учётом цели: ${goalLabels[profile.goal] || profile.goal})` : ''}

Будь конкретным, укажи на реальные визуальные различия. Если различий мало — скажи честно. Пиши на русском, кратко (до 250 слов).
Если на фото не тело/фигура — напиши: "На фото не удалось распознать фигуру для сравнения."`;
}

export type WeeklyContext = DailyContext;

export function buildWeeklyPrompt(ctx: WeeklyContext): string {
  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const sections: string[] = [];

  // Check-ins
  if (ctx.checkIns.length > 0) {
    const rows = ctx.checkIns.map((c) => {
      const d = new Date(c.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', weekday: 'short' });
      return `  ${d}: самочувствие=${c.wellbeing}, сон=${c.sleep}, стресс=${c.stress}, энергия=${c.energy}${c.note ? `, заметка: "${c.note}"` : ''}`;
    });
    sections.push(`Чек-ины (шкала 1–10):\n${rows.join('\n')}`);
  }

  // Workouts
  if (ctx.workouts.length > 0) {
    const rows = ctx.workouts.map((w) => {
      const d = new Date(w.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', weekday: 'short' });
      const exercises = w.sets.length > 0
        ? w.sets.map((s) => `${s.exerciseName} ${s.reps}×${s.weight}кг`).join(', ')
        : 'без упражнений';
      return `  ${d}: ${w.type}${w.durationMin ? `, ${w.durationMin} мин` : ''} — ${exercises}`;
    });
    sections.push(`Тренировки:\n${rows.join('\n')}`);
  }

  // Body metrics
  if (ctx.body.length > 0) {
    const rows = ctx.body.map((b) => {
      const d = new Date(b.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const parts: string[] = [];
      if (b.weight != null) parts.push(`вес=${b.weight}кг`);
      if (b.bodyFatPct != null) parts.push(`жир=${b.bodyFatPct}%`);
      if (b.muscleMass != null) parts.push(`мышцы=${b.muscleMass}%`);
      return `  ${d}: ${parts.join(', ')}`;
    });
    sections.push(`Тело:\n${rows.join('\n')}`);
  }

  // Meals
  if (ctx.meals.length > 0) {
    const rows = ctx.meals.map((m) => {
      const d = new Date(m.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      return `  ${d}: ${m.mealType}${m.description ? ` — ${m.description}` : ''}${m.aiAnalysis ? ` (AI: ${m.aiAnalysis})` : ''}`;
    });
    sections.push(`Питание:\n${rows.join('\n')}`);
  }

  // Health (Apple Watch)
  if (ctx.health.length > 0) {
    const rows = ctx.health.map((h) => {
      const d = new Date(h.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const parts: string[] = [];
      if (h.steps != null) parts.push(`шаги=${h.steps}`);
      if (h.activeCalories != null) parts.push(`ккал=${h.activeCalories}`);
      if (h.restingHr != null) parts.push(`пульс=${h.restingHr}`);
      if (h.sleepHours != null) parts.push(`сон=${h.sleepHours}ч`);
      return `  ${d}: ${parts.join(', ')}`;
    });
    sections.push(`Apple Health:\n${rows.join('\n')}`);
  }

  const dataBlock = sections.length > 0
    ? sections.join('\n\n')
    : 'Данных за эту неделю нет.';

  return `Ты — опытный персональный health-коуч и аналитик. Сегодня ${today}.
Составь развёрнутый еженедельный отчёт за период ${weekAgoStr} – ${today}.

Вот полные данные пользователя за неделю:

${dataBlock}

Составь структурированный отчёт по следующему плану:

1. **Итоги недели** — общая оценка недели: что получилось, ключевые цифры (количество тренировок, средний сон, шаги, динамика веса)

2. **Тренировки** — анализ тренировочной нагрузки: частота, объём, прогресс в весах, баланс групп мышц. Что было хорошо, что можно улучшить

3. **Восстановление и сон** — анализ качества сна, уровня стресса, энергии. Тренды и корреляции (например, плохой сон → низкая энергия)

4. **Питание** — анализ режима и качества питания (если есть данные). Регулярность приёмов, баланс

5. **Тело и здоровье** — динамика веса, состава тела, пульса, активности (шаги, калории)

6. **Достижения** — что удалось на этой неделе (конкретные успехи)

7. **План на следующую неделю** — конкретные рекомендации: сколько тренировок, на что обратить внимание, цели по сну/стрессу/шагам

Будь конкретным, используй цифры из данных. Анализируй тренды и корреляции. Давай практичные советы. Пиши на русском. Объём — 500–800 слов.`;
}
