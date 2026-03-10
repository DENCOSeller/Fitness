'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listWorkouts } from './actions';

interface WorkoutWithSets {
  id: number;
  date: string | Date;
  type: string;
  status?: string;
  durationMin: number | null;
  note: string | null;
  sets: {
    exercise: { id: number; name: string; muscleGroup: string; type?: string };
    reps: number;
    weight: number;
    duration: number | null;
    distance: number | null;
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
    return sets
      .filter(s => !(s.exercise.type === 'cardio' || s.exercise.muscleGroup === 'Кардио' || s.duration != null))
      .reduce((sum, s) => sum + s.reps * s.weight, 0);
  };

  const getCardioSummary = (sets: WorkoutWithSets['sets']) => {
    const cardioSets = sets.filter(s => s.exercise.type === 'cardio' || s.exercise.muscleGroup === 'Кардио' || s.duration != null);
    if (cardioSets.length === 0) return null;
    const totalDuration = cardioSets.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalDistance = cardioSets.reduce((sum, s) => sum + (s.distance || 0), 0);
    const parts: string[] = [];
    if (totalDuration > 0) parts.push(`${totalDuration} мин`);
    if (totalDistance > 0) parts.push(`${totalDistance} км`);
    return parts.join(', ');
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Тренировки</h1>
        <div className="flex gap-2">
          <Link
            href="/workouts/templates"
            className="text-accent text-sm font-medium px-4 py-2 rounded-xl hover:bg-accent/10 transition-colors"
          >
            Шаблоны
          </Link>
          <Link
            href="/workouts/new"
            className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-accent/90 transition-colors"
          >
            + Новая
          </Link>
        </div>
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

      {(() => {
        const planned = workouts.filter(w => w.status === 'planned');
        const completed = workouts.filter(w => w.status !== 'planned');
        const sections: { label: string | null; items: WorkoutWithSets[] }[] = [];
        if (planned.length > 0) sections.push({ label: 'Запланированные', items: planned });
        if (completed.length > 0) sections.push({ label: planned.length > 0 ? 'Выполненные' : null, items: completed });

        return sections.map((section) => (
          <div key={section.label ?? 'all'} className="space-y-3">
            {section.label && (
              <h2 className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                {section.label === 'Запланированные' && <span>📋</span>}
                {section.label}
              </h2>
            )}
            {section.items.map((w) => {
              const uniqueExercises = getUniqueExercises(w.sets);
              const volume = getTotalVolume(w.sets);
              const cardioSummary = getCardioSummary(w.sets);
              const isPlanned = w.status === 'planned';

              return (
                <Link
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  className={`block rounded-2xl p-4 transition-colors ${
                    isPlanned
                      ? 'bg-accent/10 border border-accent/30 hover:bg-accent/15'
                      : 'bg-card hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isPlanned && <span className="text-xs">📋</span>}
                      <span className="text-text font-semibold text-sm">{w.type}</span>
                      {isPlanned && (
                        <span className="text-[10px] text-accent bg-accent/15 px-1.5 py-0.5 rounded-md font-medium">ПЛАН</span>
                      )}
                      {w.durationMin && (
                        <span className="text-text-secondary text-xs">{w.durationMin} мин</span>
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
                    {cardioSummary && <span>{cardioSummary}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        ));
      })()}
    </div>
  );
}
