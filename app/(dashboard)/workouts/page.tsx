'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listWorkouts } from './actions';

interface WorkoutWithSets {
  id: number;
  date: string | Date;
  type: string;
  durationMin: number | null;
  note: string | null;
  sets: {
    exercise: { id: number; name: string; muscleGroup: string };
    reps: number;
    weight: number;
  }[];
  _count: { sets: number };
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWorkouts().then((data) => {
      setWorkouts(data as unknown as WorkoutWithSets[]);
      setLoading(false);
    });
  }, []);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getUniqueExercises = (sets: WorkoutWithSets['sets']) => {
    const seen = new Set<number>();
    return sets.filter((s) => {
      if (seen.has(s.exercise.id)) return false;
      seen.add(s.exercise.id);
      return true;
    });
  };

  const getTotalVolume = (sets: WorkoutWithSets['sets']) => {
    return sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Тренировки</h1>
        <Link
          href="/workouts/new"
          className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-accent/90 transition-colors"
        >
          + Новая
        </Link>
      </div>

      {loading && (
        <div className="text-text-secondary text-sm text-center py-8">Загрузка...</div>
      )}

      {!loading && workouts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm mb-4">Пока нет тренировок</p>
          <Link
            href="/workouts/new"
            className="text-accent text-sm"
          >
            Записать первую тренировку
          </Link>
        </div>
      )}

      {workouts.map((w) => {
        const uniqueExercises = getUniqueExercises(w.sets);
        const volume = getTotalVolume(w.sets);

        return (
          <Link
            key={w.id}
            href={`/workouts/${w.id}`}
            className="block bg-card rounded-2xl p-4 hover:bg-card-hover transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-text font-semibold text-sm">{w.type}</span>
                {w.durationMin && (
                  <span className="text-text-secondary text-xs ml-2">{w.durationMin} мин</span>
                )}
              </div>
              <span className="text-text-secondary text-xs">{formatDate(w.date)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {uniqueExercises.map((s) => (
                <span
                  key={s.exercise.id}
                  className="bg-bg text-text-secondary text-xs px-2 py-0.5 rounded-md"
                >
                  {s.exercise.name}
                </span>
              ))}
            </div>

            <div className="flex gap-4 text-text-secondary text-xs">
              <span>{uniqueExercises.length} упр.</span>
              <span>{w._count.sets} подх.</span>
              {volume > 0 && <span>{volume.toLocaleString('ru-RU')} кг объём</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
