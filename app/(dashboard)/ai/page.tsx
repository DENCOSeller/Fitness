'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getDailyInsight,
  generateDailyInsight,
  getWeeklyReport,
  generateWeeklyReport,
  getInsightHistory,
} from './actions';

interface Insight {
  content: string;
  cached: boolean;
  date: Date;
  model: string;
  createdAt?: Date;
}

interface HistoryItem {
  id: number;
  date: Date;
  type: string;
  content: string;
  model: string;
  createdAt: Date;
}

export default function AiPage() {
  const [today, setToday] = useState<Insight | null>(null);
  const [weekly, setWeekly] = useState<Insight | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'today' | 'weekly' | 'history'>('today');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cached, weeklyCache, hist] = await Promise.all([
      getDailyInsight(),
      getWeeklyReport(),
      getInsightHistory(),
    ]);
    if (cached) setToday(cached as Insight);
    if (weeklyCache) setWeekly(weeklyCache as Insight);
    setHistory(hist as HistoryItem[]);
  }

  function handleGenerateDaily() {
    setError('');
    startTransition(async () => {
      const result = await generateDailyInsight();
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setToday(result as Insight);
      const hist = await getInsightHistory();
      setHistory(hist as HistoryItem[]);
    });
  }

  function handleGenerateWeekly() {
    setError('');
    startTransition(async () => {
      const result = await generateWeeklyReport();
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setWeekly(result as Insight);
      const hist = await getInsightHistory();
      setHistory(hist as HistoryItem[]);
    });
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-text">AI-советы</h1>

      {/* Trainer link */}
      <Link
        href="/ai/trainer"
        className="flex items-center gap-3 bg-card rounded-2xl p-4 hover:bg-card-hover transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-text">DENCO Тренер</p>
          <p className="text-xs text-text-secondary">Чат с персональным AI-тренером</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-text-secondary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['today', 'weekly', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-accent text-white'
                : 'bg-card text-text-secondary'
            }`}
          >
            {t === 'today' ? 'Сегодня' : t === 'weekly' ? 'Неделя' : 'История'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-danger/15 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Daily tab */}
      {tab === 'today' && (
        <div className="space-y-4">
          {!today && (
            <div className="bg-card rounded-2xl p-5 text-center space-y-4">
              <p className="text-text-secondary text-sm">
                AI проанализирует ваши данные за последние 7 дней и даст персональный совет на сегодня.
              </p>
              <button
                onClick={handleGenerateDaily}
                disabled={isPending}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {isPending ? <Spinner text="Генерирую совет..." /> : 'Получить совет на сегодня'}
              </button>
            </div>
          )}

          {today && (
            <InsightCard
              title="Совет на сегодня"
              insight={today}
            />
          )}
        </div>
      )}

      {/* Weekly tab */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          {!weekly && (
            <div className="bg-card rounded-2xl p-5 text-center space-y-4">
              <p className="text-text-secondary text-sm">
                Развёрнутый анализ всей недели: тренировки, питание, сон, вес — с рекомендациями на следующую неделю.
              </p>
              <p className="text-xs text-text-secondary">
                Используется модель Claude Opus для глубокого анализа
              </p>
              <button
                onClick={handleGenerateWeekly}
                disabled={isPending}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {isPending ? <Spinner text="Генерирую отчёт..." /> : 'Недельный отчёт'}
              </button>
            </div>
          )}

          {weekly && (
            <InsightCard
              title="Отчёт за неделю"
              insight={weekly}
              showDate
            />
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-sm text-text-secondary py-8">
              История пуста. Получите первый совет на вкладке «Сегодня».
            </p>
          ) : (
            history.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  );
}

function InsightCard({ title, insight, showDate }: { title: string; insight: Insight; showDate?: boolean }) {
  return (
    <div className="bg-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {insight.cached && (
          <span className="text-xs text-text-secondary bg-card-hover rounded-lg px-2 py-1">
            из кэша
          </span>
        )}
      </div>
      {showDate && insight.createdAt && (
        <p className="text-xs text-text-secondary">
          Создан: {new Date(insight.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
      <div className="prose-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
        {formatMarkdown(insight.content)}
      </div>
      <div className="pt-2 border-t border-border">
        <span className="text-xs text-text-secondary">
          Модель: {insight.model}
        </span>
      </div>
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(item.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });

  const typeLabel = item.type === 'weekly' ? 'Недельный' : 'Дневной';
  const preview = item.content.slice(0, 120) + (item.content.length > 120 ? '...' : '');

  return (
    <div
      className="bg-card rounded-2xl p-4 cursor-pointer transition-colors hover:bg-card-hover"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{dateStr}</span>
          <span className={`text-xs px-2 py-0.5 rounded-lg ${
            item.type === 'weekly'
              ? 'bg-accent/15 text-accent'
              : 'bg-card-hover text-text-secondary'
          }`}>
            {typeLabel}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
      {expanded ? (
        <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
          {formatMarkdown(item.content)}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">{preview}</p>
      )}
    </div>
  );
}

function formatMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-text font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
