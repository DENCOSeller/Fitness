# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DENCO Health — веб-трекер здоровья с мультипользовательской системой. Работает в браузере (mobile-first).

**Стек:** Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL + Claude API

**Деплой:** Beget VPS (PM2 + Nginx + Let's Encrypt)

## Architecture

Single Next.js app — и фронтенд, и бэкенд. Без отдельного API-сервера.

- **БД**: PostgreSQL на Beget, доступ через Prisma ORM
- **Авторизация**: регистрация/логин по email+пароль (bcrypt), HTTP-only cookie с userId, Next.js middleware
- **AI**: Claude API через Server Actions (ключ только на сервере)
- **Файлы**: `public/uploads/` на диске VPS

Модули: чек-ин, тренировки, питание, тело (Picooc скриншот → Claude Vision), Apple Health (импорт XML), AI-рекомендации, графики (Recharts).

## Plans

- `plan/strategy.md` — архитектура, модули, схема БД, деплой, риски
- `plan/chunks.md` — 21 кусок работы с зависимостями и критериями готовности

**Всегда читай эти файлы перед началом работы над новой фичей.**

## Status

Chunk 1 (инициализация проекта) — готов.
Chunk 2 (БД Prisma + PostgreSQL) — готов.
Chunk 3 (авторизация) — готов.
Chunk 4 (layout и навигация) — готов.
Chunk 5 (ежедневный чек-ин) — готов.
Chunk 6 (библиотека упражнений) — готов.
Chunk 7 (журнал тренировок) — готов.
Chunk 8–20 — готовы.
Chunk 21 (деплой на сервер) — готов.
Chunk 24 (мультипользователи) — готов.
Chunk 25 (активная тренировка) — готов.

## Active Workout (Chunk 25)

Режим live-tracking тренировки с таймером, подходами и отдыхом.

### БД (миграция `20260313071856_active_workout_fields`)

- `Workout`: добавлены `started_at DateTime?`, `ended_at DateTime?`. Статус `in_progress` (помимо `planned`/`completed`).
- `WorkoutSet`: добавлены `completed Boolean @default(false)`, `completed_at DateTime?`.

### Роут `/workouts/active`

- **Start screen**: выбор типа → создание Workout `in_progress`
- **Active screen**: sticky header с таймером (Date.now() based), список упражнений (accordion), sticky кнопка «Завершить»
- **Баннер** на `/workouts`: зелёный, с живым таймером, если есть `in_progress` тренировка

### WorkoutSet — кардио и трекинг полей (миграция `20260313100412_add_set_timing_fields`)

- `set_started_at DateTime?` — момент фокуса на инпуте подхода (onFocus → `startSet()`)
- `set_ended_at DateTime?` — момент нажатия ✓ (`completeSet()`)
- Кардио поля (были в схеме): `duration Int?`, `speed Float?`, `incline Float?`, `distance Float?`

Данные для AI тренера: время подхода (`setEndedAt - setStartedAt`), реальное время отдыха (`set[n].setStartedAt - set[n-1].setEndedAt`).

### Типология упражнений (4 типа)

| Тип | Поля ввода | Примеры |
|-----|-----------|---------|
| `strength` | reps + weight (кг) | Жим лёжа, приседания со штангой |
| `bodyweight` | reps + weight опциональный ("Утяжелитель кг") | Отжимания, подтягивания |
| `cardio` | duration(мин) + speed(км/ч) + incline(%) + distance(км) | Бег, велосипед, дорожка |
| `timed` | duration (сек) | Планка, растяжка, вис |

AI tool schema (`create_workout_plan`) возвращает `type` enum + правильные поля по типу. Промпт запрещает смешивать поля (reps для cardio и т.д.).

UI в активном режиме и превью плана рендерит column headers и input fields по `exercise.type`.

### Управление упражнениями в активном режиме

- Кнопка `i` в header → bottomsheet с инфо (название, группа мышц, описание) + "Заменить упражнение" → ExercisePicker
- Кнопка `✕` в header → двойное нажатие для подтверждения → удаление всех сетов упражнения

### Server Actions (`app/(dashboard)/workouts/active/actions.ts`)

`startWorkout`, `getActiveWorkout`, `addExerciseToWorkout`, `addSetToWorkout`, `updateSet`, `startSet`, `completeSet`, `finishWorkout`, `discardWorkout`, `replaceExerciseInWorkout`, `removeExerciseFromWorkout`

### Rest Timer (`components/workout/rest-timer.tsx`)

Полностью переписан. Fullscreen overlay, SVG circle 200px, цвет по остатку (зелёный → жёлтый → красный), Date.now() based. Props: `{ isOpen, onClose, defaultSeconds? }`.

## Commands

```bash
npm run dev               # Dev server (localhost:3000)
npm run build             # Production build
npm run start             # Production server
npx prisma migrate dev    # Миграции (dev)
npx prisma migrate deploy # Миграции (production)
npx prisma studio         # Визуальный браузер БД
```

## Deploy

```bash
./server-setup.sh          # Первоначальная настройка сервера (один раз)
./deploy.sh                # Деплой обновлений
pm2 status                 # Статус приложения
pm2 logs denco-health      # Логи
pm2 restart denco-health   # Рестарт
```

- **PM2 конфиг**: `ecosystem.config.js`
- **Nginx конфиг**: `nginx.conf` (копируется в `/etc/nginx/sites-available/`)
- **Standalone build**: `next.config.ts` → `output: "standalone"`

## Workout Plan (Sprint: AI Plan vs Fact)

### БД (миграция `20260313090635_add_workout_plan_exercises`)

Таблица `workout_plan_exercises` — хранит план от AI тренера отдельно от фактических подходов (`workout_sets`).

| Поле | Тип | Назначение |
|------|-----|------------|
| `workout_id` | `Int` FK CASCADE | Связь с Workout |
| `exercise_id` | `Int?` FK SET NULL | Связь с Exercise (nullable — если не найдено в каталоге) |
| `exercise_name` | `String` | Оригинальное имя от AI |
| `planned_sets` | `Int` | Кол-во подходов по плану |
| `planned_reps` | `Int` | Повторения по плану |
| `planned_weight` | `Float?` | Вес по плану (nullable) |
| `rest_seconds` | `Int?` | Рекомендуемый отдых |
| `sort_order` | `Int` | Порядок в плане |

**Связи:** `Workout hasMany WorkoutPlanExercise`, `Exercise hasMany WorkoutPlanExercise (SET NULL)`

**Концепция:** План (что рекомендовал AI) живёт в `workout_plan_exercises`, факт (что сделал пользователь) — в `workout_sets`. Можно сравнивать plan vs fact после завершения.

### Exercise Matcher (`lib/exercise-matcher.ts`)

Нечёткий поиск упражнений по названию от AI: exact → partial (includes) → Левенштейн (порог >0.7) → create new (`muscleGroup: 'Другое'`). Batch-версия `findOrCreateExercises()` грузит все упражнения одним запросом.

### Создание плана (`app/(dashboard)/ai/trainer/workout-from-plan.ts`)

`createWorkoutFromPlan()` создаёт одним запросом: `Workout(status='planned')` + `WorkoutPlanExercise[]` (план AI) + `WorkoutSet[]` (предзаполнение для активного режима).

### AI Tool Use (`app/api/chat/route.ts`)

Claude вызывает `create_workout_plan` tool со структурированными данными (exercises, weight_kg, rest_seconds). Стриминг обрабатывает `input_json_delta` → отправляет `{ tool_use }` по SSE. Клиент (`ai/trainer/page.tsx`) использует tool_use данные с приоритетом над regex-парсером. Системный промпт (`lib/ai-trainer.ts`) обязывает AI указывать веса и время отдыха.

### Weight History Fallback (`lib/exercise-history.ts`)

`getLastWeightsForExercises(userId, exerciseIds[])` — один SQL запрос (`DISTINCT ON`), возвращает последний вес из completed тренировок. Используется в `workout-from-plan.ts`: приоритет весов AI → история → null/0.

## Editable Plan Preview (Chunk 5 Sprint: Plan Editing)

### Server Actions (`app/(dashboard)/workouts/plan-actions.ts`)

7 actions для редактирования плана ДО старта тренировки:
`getWorkoutWithPlan`, `updatePlanExercise`, `addSetToPlan`, `removeSetFromPlan`, `addExerciseToPlan`, `removeExerciseFromPlan`, `updateRestSeconds`

- `getWorkoutWithPlan` — загружает workout + planExercises + last weights (история по каждому упражнению)
- Все actions проверяют userId + status='planned'

### Workout Detail (`app/(dashboard)/workouts/[id]/page.tsx`)

Два вида:
- **PlanPreview** (status='planned') — редактируемые подходы (per-set в локальном стейте), добавление/удаление упражнений (ExercisePicker), кликабельный отдых, подсказки "последний раз", sticky зелёная кнопка "Начать тренировку"
- **CompletedView** (status='completed') — прежний read-only вид

### startPlannedWorkout (active/actions.ts)

Принимает optional `overrides: { planExerciseId, sets[] }[]` — per-set данные из клиентского стейта. Создаёт `WorkoutSet` из `planExercises` с учётом правок пользователя.

## Sprint Summary: Active Workout + AI Plan Prefill (2026-03-13)

Полный цикл: AI генерирует план → пользователь редактирует → запускает → выполняет с подсказками.

### Что реализовано

| # | Коммит | Что |
|---|--------|-----|
| Chunk 1 | `8b3290a` | WorkoutPlanExercise таблица — хранит план от AI отдельно от факта |
| Chunk 2 | `5c2af79` | Exercise fuzzy matcher — exact → partial → Левенштейн → create new |
| Chunk 3 | `a7a012a` | AI tool_use — структурированный вывод плана вместо парсинга текста |
| Chunk 4 | `1ce351f` | Fallback весов из истории — если AI не указал вес |
| Chunk 5 | `d7c4710` | Редактируемый превью плана (`/workouts/[id]` для status=planned) |
| Chunk 6 | `a9e1a61` | Предзаполнение активного режима из плана + plan hints + rest timer из плана |

### Ключевые решения

- **Plan vs Fact**: `workout_plan_exercises` (план AI) отделён от `workout_sets` (факт пользователя)
- **Per-set editing**: локальный стейт на клиенте, `overrides` передаются в `startPlannedWorkout`
- **Pre-fill приоритет**: localEdits → оригинальное значение → plan fallback → пустая строка
- **Rest timer**: `restSeconds` из `WorkoutPlanExercise` per exercise, передаётся динамически

## Environment Variables (.env)

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — подпись cookie (хранит userId)
- `ANTHROPIC_API_KEY` — ключ Claude API
