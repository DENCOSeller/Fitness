'use client';

import { useEffect, useState, useRef } from 'react';
import { getHealthDaily, getHealthWorkouts, getHealthStats, getHealthDailyByPeriod } from './actions';
import HealthStepsChart from '@/components/charts/health-steps-chart';
import HealthSleepChart from '@/components/charts/health-sleep-chart';
import HealthHrChart from '@/components/charts/health-hr-chart';

type HealthDailyRecord = {
  id: number;
  date: string;
  steps: number | null;
  activeCalories: number | null;
  restingHr: number | null;
  sleepHours: number | null;
};

type HealthWorkoutRecord = {
  id: number;
  date: string;
  type: string;
  durationMin: number | null;
  calories: number | null;
  source: string | null;
};

type Stats = {
  totalDaily: number;
  totalWorkouts: number;
  latestDate: string | null;
  earliestDate: string | null;
};

type ImportResult = {
  success: boolean;
  totalRecordsProcessed: number;
  dailyRecords: number;
  workouts: number;
  error?: string;
};

type Period = 'week' | 'month' | '3months' | 'year';

type ChartData = {
  date: string;
  steps: number | null;
  activeCalories: number | null;
  restingHr: number | null;
  sleepHours: number | null;
};

type Tab = 'daily' | 'workouts';

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

export default function HealthPage() {
  const [dailyRecords, setDailyRecords] = useState<HealthDailyRecord[]>([]);
  const [workouts, setWorkouts] = useState<HealthWorkoutRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('daily');
  const [period, setPeriod] = useState<Period>('month');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadChartData(period);
  }, [period]);

  async function loadData() {
    const [daily, wk, st] = await Promise.all([
      getHealthDaily(),
      getHealthWorkouts(),
      getHealthStats(),
    ]);
    setDailyRecords(daily);
    setWorkouts(wk);
    setStats(st);
  }

  async function loadChartData(p: Period) {
    const data = await getHealthDailyByPeriod(p);
    setChartData(data);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setImportResult(null);
    setImportProgress('Загрузка файла...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setImportProgress('Парсинг данных Apple Health...');

      const res = await fetch('/api/health-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка импорта');
        return;
      }

      setImportResult(data);
      await loadData();
      await loadChartData(period);
    } catch {
      setError('Ошибка импорта файла');
    } finally {
      setImporting(false);
      setImportProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Apple Health</h1>

      {/* Import section */}
      <div className="bg-card rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Импорт данных</h2>
        <p className="text-sm text-text-secondary">
          Экспортируйте данные из приложения &laquo;Здоровье&raquo; на iPhone
          (Профиль &rarr; Экспортировать все данные) и загрузите ZIP-файл.
        </p>

        {importing ? (
          <div className="flex items-center gap-3 bg-accent/10 rounded-xl px-4 py-4">
            <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <span className="text-sm text-accent font-medium">{importProgress}</span>
              <p className="text-xs text-text-secondary mt-0.5">
                Это может занять несколько минут для больших файлов
              </p>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 bg-card-hover rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-accent transition-colors">
            <svg
              className="h-8 w-8 text-text-secondary mb-2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-sm text-text-secondary">Выберите ZIP-файл</span>
            <span className="text-xs text-text-secondary mt-0.5">export.zip</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className="bg-success/15 text-success rounded-xl px-4 py-3 text-sm space-y-1">
            <div className="font-medium">Импорт завершён</div>
            <div>Обработано записей: {formatNumber(importResult.totalRecordsProcessed)}</div>
            <div>Дневных записей: {formatNumber(importResult.dailyRecords)}</div>
            <div>Тренировок: {formatNumber(importResult.workouts)}</div>
          </div>
        )}

        {/* Stats */}
        {stats && stats.totalDaily > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card-hover rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{formatNumber(stats.totalDaily)}</div>
              <div className="text-xs text-text-secondary">Дней данных</div>
            </div>
            <div className="bg-card-hover rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{formatNumber(stats.totalWorkouts)}</div>
              <div className="text-xs text-text-secondary">Тренировок</div>
            </div>
            {stats.earliestDate && (
              <div className="bg-card-hover rounded-xl p-3 text-center">
                <div className="text-sm font-bold">{formatDisplayDate(stats.earliestDate)}</div>
                <div className="text-xs text-text-secondary">Самая ранняя</div>
              </div>
            )}
            {stats.latestDate && (
              <div className="bg-card-hover rounded-xl p-3 text-center">
                <div className="text-sm font-bold">{formatDisplayDate(stats.latestDate)}</div>
                <div className="text-xs text-text-secondary">Самая поздняя</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts section */}
      {chartData.length > 0 && (
        <div className="space-y-4">
          {/* Period switcher */}
          <div className="flex gap-1.5 bg-card rounded-xl p-1.5">
            {([
              ['week', 'Неделя'],
              ['month', 'Месяц'],
              ['3months', '3 мес'],
              ['year', 'Год'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === key
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Averages */}
          {(() => {
            const stepsArr = chartData.filter((d) => d.steps != null).map((d) => d.steps!);
            const calArr = chartData.filter((d) => d.activeCalories != null).map((d) => d.activeCalories!);
            const hrArr = chartData.filter((d) => d.restingHr != null).map((d) => d.restingHr!);
            const sleepArr = chartData.filter((d) => d.sleepHours != null).map((d) => d.sleepHours!);
            const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
            const avgSleep = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

            const avgSteps = avg(stepsArr);
            const avgCal = avg(calArr);
            const avgHr = avg(hrArr);
            const avgSl = avgSleep(sleepArr);

            return (
              <div className="grid grid-cols-4 gap-2">
                {avgSteps != null && (
                  <div className="bg-card rounded-xl p-2.5 text-center">
                    <div className="text-sm font-bold">{formatNumber(avgSteps)}</div>
                    <div className="text-[10px] text-text-secondary">шаг/день</div>
                  </div>
                )}
                {avgCal != null && (
                  <div className="bg-card rounded-xl p-2.5 text-center">
                    <div className="text-sm font-bold">{formatNumber(avgCal)}</div>
                    <div className="text-[10px] text-text-secondary">ккал/день</div>
                  </div>
                )}
                {avgHr != null && (
                  <div className="bg-card rounded-xl p-2.5 text-center">
                    <div className="text-sm font-bold">{avgHr}</div>
                    <div className="text-[10px] text-text-secondary">пульс</div>
                  </div>
                )}
                {avgSl != null && (
                  <div className="bg-card rounded-xl p-2.5 text-center">
                    <div className="text-sm font-bold">{avgSl}ч</div>
                    <div className="text-[10px] text-text-secondary">сон</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Steps + Calories chart */}
          <div className="bg-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Шаги и калории</h3>
            <HealthStepsChart data={chartData} />
          </div>

          {/* Sleep chart */}
          <div className="bg-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Сон</h3>
            <HealthSleepChart data={chartData} />
          </div>

          {/* Heart rate chart */}
          <div className="bg-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Пульс покоя</h3>
            <HealthHrChart data={chartData} />
          </div>
        </div>
      )}

      {/* Data tabs */}
      {(dailyRecords.length > 0 || workouts.length > 0) && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('daily')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === 'daily'
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-secondary'
              }`}
            >
              Дневные данные
            </button>
            <button
              onClick={() => setTab('workouts')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === 'workouts'
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-secondary'
              }`}
            >
              Тренировки
            </button>
          </div>

          {tab === 'daily' && (
            <div className="space-y-2">
              {dailyRecords.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 text-center">
                  <p className="text-text-secondary text-sm">Нет дневных данных</p>
                </div>
              ) : (
                dailyRecords.map((r) => (
                  <div key={r.id} className="bg-card rounded-2xl p-4">
                    <div className="text-sm font-medium mb-2">
                      {formatDisplayDate(r.date)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {r.steps != null && (
                        <div className="bg-card-hover rounded-xl py-2 px-3">
                          <div className="text-lg font-bold">
                            {formatNumber(r.steps)}
                          </div>
                          <div className="text-[10px] text-text-secondary">шагов</div>
                        </div>
                      )}
                      {r.activeCalories != null && (
                        <div className="bg-card-hover rounded-xl py-2 px-3">
                          <div className="text-lg font-bold">
                            {formatNumber(r.activeCalories)}
                          </div>
                          <div className="text-[10px] text-text-secondary">ккал</div>
                        </div>
                      )}
                      {r.restingHr != null && (
                        <div className="bg-card-hover rounded-xl py-2 px-3">
                          <div className="text-lg font-bold">{r.restingHr}</div>
                          <div className="text-[10px] text-text-secondary">
                            пульс покоя
                          </div>
                        </div>
                      )}
                      {r.sleepHours != null && (
                        <div className="bg-card-hover rounded-xl py-2 px-3">
                          <div className="text-lg font-bold">{r.sleepHours}ч</div>
                          <div className="text-[10px] text-text-secondary">сон</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'workouts' && (
            <div className="space-y-2">
              {workouts.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 text-center">
                  <p className="text-text-secondary text-sm">Нет тренировок</p>
                </div>
              ) : (
                workouts.map((w) => (
                  <div key={w.id} className="bg-card rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{w.type}</div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          {formatDisplayDate(w.date)}
                          {w.source && ` · ${w.source}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      {w.durationMin != null && w.durationMin > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">{w.durationMin}</span>
                          <span className="text-text-secondary ml-1">мин</span>
                        </div>
                      )}
                      {w.calories != null && w.calories > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">{w.calories}</span>
                          <span className="text-text-secondary ml-1">ккал</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {stats && stats.totalDaily === 0 && stats.totalWorkouts === 0 && (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            Данные Apple Health ещё не импортированы
          </p>
        </div>
      )}
    </div>
  );
}
