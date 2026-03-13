'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listWorkouts } from './actions';
import { getActiveWorkout } from './active/actions';
import ExercisesPanel from '@/components/workouts/exercises-panel';

type WorkoutsTab = 'journal' | 'exercises';

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

interface ActiveWorkout {
  id: number;
  type: string;
  startedAt: string | null;
}

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState<WorkoutsTab>('journal');
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    Promise.all([listWorkouts(), getActiveWorkout()]).then(([data, res]) => {
      const all = data as unknown as WorkoutWithSets[];
      setWorkouts(all.filter(w => w.status !== 'in_progress'));
      if (res.workout) setActive(res.workout as unknown as ActiveWorkout);
      setLoading(false);
    });
  }, []);

  // Live timer for active workout banner
  useEffect(() => {
    if (!active?.startedAt) return;
    const startMs = new Date(active.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.startedAt]);

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
        {activeTab === 'journal' && (
          <div className="flex gap-2">
            <Link
              href="/workouts/templates"
              className="text-accent text-sm font-medium px-4 py-2 rounded-xl hover:bg-accent/10 transition-colors"
            >
              Шаблоны
            </Link>
            <Link
              href="/workouts/active"
              className="btn-gradient text-sm px-4 py-2"
            >
              + Старт
            </Link>
          </div>
        )}
      </div>

      {/* Active workout banner */}
      {active && (
        <Link href="/workouts/active"
          className="block bg-success/15 border border-success/30 rounded-2xl p-4 hover:bg-success/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-success text-lg">&#9899;</span>
              <div>
                <span className="text-text font-medium text-sm">{active.type}</span>
                <span className="text-text-secondary text-xs ml-2">идёт</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-success font-mono font-bold tabular-nums text-sm">{formatElapsed(elapsed)}</span>
              <span className="text-success text-xs font-medium">Продолжить →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Tabs */}
      <div className="flex bg-card rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'journal' ? 'tab-active' : 'text-text-secondary'
          }`}
        >
          Журнал
        </button>
        <button
          onClick={() => setActiveTab('exercises')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'exercises' ? 'tab-active' : 'text-text-secondary'
          }`}
        >
          Упражнения
        </button>
      </div>

      {activeTab === 'exercises' ? (
        <ExercisesPanel />
      ) : (
      <>

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
      </>
      )}
    </div>
  );
}
