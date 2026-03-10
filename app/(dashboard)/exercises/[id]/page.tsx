'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getExerciseProgress } from './actions';
import ExerciseProgressChart from '@/components/charts/exercise-progress-chart';

type WorkoutEntry = {
  workoutId: number;
  date: string;
  workoutType: string;
  sets: { setOrder: number; reps: number; weight: number }[];
  maxWeight: number;
  totalVolume: number;
};

type ExerciseData = {
  id: number;
  name: string;
  muscleGroup: string;
  history: WorkoutEntry[];
};

export default function ExerciseProgressPage() {
  const params = useParams();
  const id = Number(params.id);
  const [data, setData] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const result = await getExerciseProgress(id);
      if ('error' in result && result.error) {
        setError(result.error);
      } else if (!('error' in result)) {
        setData(result);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="text-text-secondary text-sm text-center py-12">Загрузка...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Link href="/exercises" className="text-accent text-sm">&larr; Упражнения</Link>
        <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
          {error || 'Упражнение не найдено'}
        </div>
      </div>
    );
  }

  const chartData = data.history.map((entry) => ({
    date: new Date(entry.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    maxWeight: entry.maxWeight,
    totalVolume: entry.totalVolume,
  }));

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <Link href="/exercises" className="text-accent text-sm">&larr; Упражнения</Link>
        <h1 className="text-2xl font-bold mt-1">{data.name}</h1>
        <p className="text-text-secondary text-sm">{data.muscleGroup}</p>
      </div>

      {/* Chart */}
      {data.history.length > 1 ? (
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">Прогресс</h2>
          <ExerciseProgressChart data={chartData} />
        </div>
      ) : data.history.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 text-center">
          <p className="text-text-secondary text-sm">
            Нет данных. Добавьте это упражнение в тренировку.
          </p>
        </div>
      ) : null}

      {/* Stats summary */}
      {data.history.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-accent">
              {Math.max(...data.history.map((h) => h.maxWeight))}
            </div>
            <div className="text-xs text-text-secondary">Макс. вес, кг</div>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-accent">
              {Math.max(...data.history.map((h) => h.totalVolume))}
            </div>
            <div className="text-xs text-text-secondary">Макс. объём</div>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-accent">
              {data.history.length}
            </div>
            <div className="text-xs text-text-secondary">Тренировок</div>
          </div>
        </div>
      )}

      {/* History table */}
      {data.history.length > 0 && (
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">История по тренировкам</h2>
          <div className="space-y-3">
            {data.history.map((entry) => (
              <Link
                key={entry.workoutId}
                href={`/workouts/${entry.workoutId}`}
                className="block bg-card-hover rounded-xl p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {new Date(entry.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-text-secondary">{entry.workoutType}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.sets.map((set) => (
                    <span
                      key={set.setOrder}
                      className="bg-bg rounded-lg px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {set.reps}&times;{set.weight}кг
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>Макс: <span className="text-text font-medium">{entry.maxWeight} кг</span></span>
                  <span>Объём: <span className="text-text font-medium">{entry.totalVolume}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
