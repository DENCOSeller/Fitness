'use client';

import type { CalorieBalance } from '@/lib/calorie-balance';

const RADIUS = 54;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CalorieBalanceWidget({ data }: { data: CalorieBalance }) {
  const { dailyNorm, eaten, workoutBurned, remaining, deficit } = data;

  if (dailyNorm === null) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-2">Калории за день</h2>
        <p className="text-sm text-text-secondary">
          Нет данных о СООВ. Загрузите скриншот Picooc в разделе «Тело».
        </p>
      </div>
    );
  }

  const progress = dailyNorm > 0 ? Math.min(eaten / dailyNorm, 1.5) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - Math.min(progress, 1));
  const isOver = eaten > dailyNorm;

  // Ring color
  const ringColor = isOver ? '#FF453A' : progress > 0.85 ? '#FF9F0A' : '#30D158';

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-secondary">Калории за день</h2>
        {deficit && (
          <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full">
            -500 дефицит
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-card-hover"
            />
            {/* Progress arc */}
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 64 64)"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${isOver ? 'text-danger' : ''}`}>
              {remaining !== null ? (isOver ? '+' : '') + Math.abs(remaining!) : '—'}
            </span>
            <span className="text-[10px] text-text-secondary">
              {isOver ? 'сверх нормы' : 'осталось'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <StatRow
            label="Норма"
            value={dailyNorm}
            color="text-text"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            }
          />
          <StatRow
            label="Съедено"
            value={eaten}
            color={isOver ? 'text-danger' : 'text-accent'}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" />
              </svg>
            }
          />
          <StatRow
            label="Сожжено"
            value={workoutBurned}
            color="text-success"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.51 6.51 0 007.5 10.5a6.5 6.5 0 006.5-6.5c0-.592-.082-1.166-.238-1.714z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`${color} opacity-70`}>{icon}</span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value} ккал</span>
    </div>
  );
}
