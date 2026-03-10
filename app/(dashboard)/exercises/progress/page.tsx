'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getExerciseProgress, type ExerciseProgressData } from './actions';

const PERIODS = [
  { label: '1 мес', days: 30 },
  { label: '3 мес', days: 90 },
  { label: '6 мес', days: 180 },
  { label: 'Всё', days: undefined },
] as const;

const MUSCLE_ICONS: Record<string, string> = {
  'Грудь': '🫁',
  'Спина': '🔙',
  'Плечи': '💪',
  'Бицепс': '💪',
  'Трицепс': '💪',
  'Ноги': '🦵',
  'Пресс': '🎯',
  'Кардио': '❤️',
  'Другое': '🏋️',
  'Растяжка': '🧘',
};

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExerciseProgressPage() {
  const [data, setData] = useState<ExerciseProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'weight' | 'volume'>('weight');

  const period = PERIODS[periodIdx];

  useEffect(() => {
    setLoading(true);
    getExerciseProgress(period.days).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [period.days]);

  const top5 = data.slice(0, 5);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/exercises" className="text-[#8E8E93] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Прогресс упражнений</h1>
        </div>
      </div>

      {/* Period switcher */}
      <div className="flex bg-[#1C1C1E] rounded-xl p-1 gap-1">
        {PERIODS.map((p, idx) => (
          <button
            key={p.label}
            onClick={() => setPeriodIdx(idx)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodIdx === idx ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-[#8E8E93] text-sm text-center py-8">Загрузка...</div>
      )}

      {!loading && data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#8E8E93] text-sm mb-2">Нет данных о тренировках</p>
          <p className="text-[#636366] text-xs">Запишите тренировку с весами, чтобы увидеть прогресс</p>
        </div>
      )}

      {/* Top exercises */}
      {!loading && top5.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[#8E8E93]">Топ упражнений</h2>

          {top5.map((ex, idx) => {
            const isExpanded = expandedId === ex.exerciseId;
            const icon = MUSCLE_ICONS[ex.muscleGroup] || '🏋️';

            return (
              <div key={ex.exerciseId} className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ex.exerciseId)}
                  className="w-full p-4 text-left active:bg-[#2C2C2E] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-lg flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{ex.exerciseName}</span>
                        <span className="text-[10px] text-[#8E8E93] bg-[#2C2C2E] px-1.5 py-0.5 rounded flex-shrink-0">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#8E8E93]">{ex.workoutCount} трен.</span>
                        {ex.personalRecord && (
                          <span className="text-xs text-[#FF9F0A]">
                            ПР: {ex.personalRecord.weight} кг
                          </span>
                        )}
                        {ex.progressPct !== null && (
                          <span className={`text-xs font-medium ${ex.progressPct > 0 ? 'text-[#30D158]' : ex.progressPct < 0 ? 'text-[#FF453A]' : 'text-[#8E8E93]'}`}>
                            {ex.progressPct > 0 ? '+' : ''}{ex.progressPct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      className={`w-4 h-4 text-[#636366] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* PR details */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2C2C2E] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-1">Рекорд</p>
                        <p className="text-sm font-bold text-[#FF9F0A]">
                          {ex.personalRecord ? `${ex.personalRecord.weight} кг` : '—'}
                        </p>
                        {ex.personalRecord && (
                          <p className="text-[9px] text-[#636366] mt-0.5">{formatDateFull(ex.personalRecord.date)}</p>
                        )}
                      </div>
                      <div className="bg-[#2C2C2E] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-1">Первый</p>
                        <p className="text-sm font-bold">{ex.firstWeight ?? '—'} кг</p>
                      </div>
                      <div className="bg-[#2C2C2E] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-1">Последний</p>
                        <p className="text-sm font-bold">{ex.lastWeight ?? '—'} кг</p>
                        {ex.progressPct !== null && (
                          <p className={`text-[9px] mt-0.5 font-medium ${ex.progressPct > 0 ? 'text-[#30D158]' : ex.progressPct < 0 ? 'text-[#FF453A]' : 'text-[#636366]'}`}>
                            {ex.progressPct > 0 ? '↑' : ex.progressPct < 0 ? '↓' : '='} {Math.abs(ex.progressPct)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chart mode switcher */}
                    {ex.history.length >= 2 && (
                      <>
                        <div className="flex bg-[#2C2C2E] rounded-lg p-0.5 gap-0.5">
                          <button
                            onClick={() => setChartMode('weight')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              chartMode === 'weight' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                            }`}
                          >
                            Макс. вес
                          </button>
                          <button
                            onClick={() => setChartMode('volume')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              chartMode === 'volume' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                            }`}
                          >
                            Объём
                          </button>
                        </div>

                        <ExerciseChart
                          data={ex.history}
                          mode={chartMode}
                        />
                      </>
                    )}

                    {ex.history.length < 2 && (
                      <p className="text-xs text-[#636366] text-center py-3">Недостаточно данных для графика</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of exercises (6+) */}
      {!loading && data.length > 5 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[#8E8E93]">Остальные упражнения</h2>
          {data.slice(5).map((ex) => {
            const isExpanded = expandedId === ex.exerciseId;
            const icon = MUSCLE_ICONS[ex.muscleGroup] || '🏋️';

            return (
              <div key={ex.exerciseId} className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ex.exerciseId)}
                  className="w-full p-3 text-left active:bg-[#2C2C2E] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{ex.exerciseName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-[#8E8E93]">{ex.workoutCount} трен.</span>
                      {ex.personalRecord && (
                        <span className="text-xs text-[#FF9F0A]">{ex.personalRecord.weight} кг</span>
                      )}
                      {ex.progressPct !== null && (
                        <span className={`text-xs font-medium ${ex.progressPct > 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                          {ex.progressPct > 0 ? '+' : ''}{ex.progressPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#2C2C2E] rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-0.5">Рекорд</p>
                        <p className="text-sm font-bold text-[#FF9F0A]">
                          {ex.personalRecord ? `${ex.personalRecord.weight} кг` : '—'}
                        </p>
                      </div>
                      <div className="bg-[#2C2C2E] rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-0.5">Первый</p>
                        <p className="text-sm font-bold">{ex.firstWeight ?? '—'} кг</p>
                      </div>
                      <div className="bg-[#2C2C2E] rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-[#8E8E93] mb-0.5">Последний</p>
                        <p className="text-sm font-bold">{ex.lastWeight ?? '—'} кг</p>
                      </div>
                    </div>
                    {ex.history.length >= 2 && (
                      <>
                        <div className="flex bg-[#2C2C2E] rounded-lg p-0.5 gap-0.5">
                          <button
                            onClick={() => setChartMode('weight')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              chartMode === 'weight' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                            }`}
                          >
                            Макс. вес
                          </button>
                          <button
                            onClick={() => setChartMode('volume')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              chartMode === 'volume' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                            }`}
                          >
                            Объём
                          </button>
                        </div>
                        <ExerciseChart data={ex.history} mode={chartMode} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExerciseChart({ data, mode }: { data: ExerciseProgressData['history']; mode: 'weight' | 'volume' }) {
  const chartData = data.map(d => ({
    date: formatDateShort(d.date),
    value: mode === 'weight' ? d.maxWeight : d.totalVolume,
  }));

  const color = mode === 'weight' ? '#0A84FF' : '#5E5CE6';
  const label = mode === 'weight' ? 'Макс. вес (кг)' : 'Объём (кг)';

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8E8E93', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            tick={{ fill: '#8E8E93', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: '1px solid #38383A',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 12,
            }}
            formatter={(value) => [`${value} кг`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
