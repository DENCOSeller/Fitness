'use client';

import { useEffect, useState, useTransition } from 'react';
import { getDailyInsight, generateDailyInsight, getInsightHistory } from './actions';

interface Insight {
  content: string;
  cached: boolean;
  date: Date;
  model: string;
}

interface HistoryItem {
  id: number;
  date: Date;
  content: string;
  model: string;
  createdAt: Date;
}

export default function AiPage() {
  const [today, setToday] = useState<Insight | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'today' | 'history'>('today');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cached, hist] = await Promise.all([
      getDailyInsight(),
      getInsightHistory(),
    ]);
    if (cached) setToday(cached as Insight);
    setHistory(hist as HistoryItem[]);
  }

  function handleGenerate() {
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

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-text">AI-советы</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            tab === 'today'
              ? 'bg-accent text-white'
              : 'bg-card text-text-secondary'
          }`}
        >
          Сегодня
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            tab === 'history'
              ? 'bg-accent text-white'
              : 'bg-card text-text-secondary'
          }`}
        >
          История
        </button>
      </div>

      {tab === 'today' && (
        <div className="space-y-4">
          {/* Generate button */}
          {!today && (
            <div className="bg-card rounded-2xl p-5 text-center space-y-4">
              <p className="text-text-secondary text-sm">
                AI проанализирует ваши данные за последние 7 дней и даст персональный совет на сегодня.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Генерирую совет...
                  </span>
                ) : (
                  'Получить совет на сегодня'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-danger/15 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Today's insight */}
          {today && (
            <div className="bg-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">Совет на сегодня</h2>
                {today.cached && (
                  <span className="text-xs text-text-secondary bg-card-hover rounded-lg px-2 py-1">
                    из кэша
                  </span>
                )}
              </div>
              <div className="prose-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {formatMarkdown(today.content)}
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-text-secondary">
                  Модель: {today.model}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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

function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(item.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });

  const preview = item.content.slice(0, 120) + (item.content.length > 120 ? '...' : '');

  return (
    <div
      className="bg-card rounded-2xl p-4 cursor-pointer transition-colors hover:bg-card-hover"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{dateStr}</span>
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
  // Simple bold text support: **text** → <strong>text</strong>
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
