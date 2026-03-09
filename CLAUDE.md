# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DENCO Health — персональный веб-трекер здоровья для одного пользователя. Работает в браузере (mobile-first).

**Стек:** Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL + Claude API

**Деплой:** Beget VPS (PM2 + Nginx + Let's Encrypt)

## Architecture

Single Next.js app — и фронтенд, и бэкенд. Без отдельного API-сервера.

- **БД**: PostgreSQL на Beget, доступ через Prisma ORM
- **Авторизация**: пароль через `AUTH_PASSWORD`, HTTP-only cookie, Next.js middleware
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

## Commands

```bash
npm run dev               # Dev server (localhost:3000)
npm run build             # Production build
npm run start             # Production server
npx prisma migrate dev    # Миграции (dev)
npx prisma migrate deploy # Миграции (production)
npx prisma studio         # Визуальный браузер БД
```

## Environment Variables (.env)

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_PASSWORD` — пароль для входа
- `SESSION_SECRET` — подпись cookie
- `ANTHROPIC_API_KEY` — ключ Claude API
