'use client';

import { useState, useEffect, useTransition, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkout, deleteWorkout, completeWorkout } from '../actions';
import { createTemplateFromWorkout } from '../templates/actions';
import { startPlannedWorkout } from '../active/actions';
import {
  getWorkoutWithPlan,
  addSetToPlan,
  removeSetFromPlan,
  addExerciseToPlan,
  removeExerciseFromPlan,
  updateRestSeconds,
} from '../plan-actions';
import { createExerciseFromWorkout } from '../actions';
import { getExercises } from '../../exercises/actions';
import ExercisePicker from '@/components/workout/exercise-picker';

// ─── Types ───

interface WorkoutSet {
  id: number;
  setOrder: number;
  reps: number;
  weight: number;
  duration: number | null;
  distance: number | null;
  speed: number | null;
  incline: number | null;
  heartRate: number | null;
  exercise: { id: number; name: string; muscleGroup: string; type?: string };
}

interface PlanExercise {
  id: number;
  exerciseId: number | null;
  exerciseName: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight: number | null;
  restSeconds: number | null;
  sortOrder: number;
  exercise: { id: number; name: string; muscleGroup: string; type?: string } | null;
}

interface WorkoutDetail {
  id: number;
  date: string | Date;
  type: string;
  status?: string;
  durationMin: number | null;
  note: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sets: WorkoutSet[];
  planExercises?: PlanExercise[];
}

interface LastWeight {
  reps: number;
  weight: number;
  date: string | Date;
}

interface LocalSet {
  reps: number;
  weight: number;
}

// ─── Plan Preview Component ───

function PlanPreview({
  workout,
  lastWeights,
  onStart,
  onDelete,
  isPending,
  confirmDelete,
}: {
  workout: WorkoutDetail;
  lastWeights: Record<number, LastWeight>;
  onStart: (overrides: { planExerciseId: number; sets: LocalSet[] }[]) => void;
  onDelete: () => void;
  isPending: boolean;
  confirmDelete: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const planExercises = workout.planExercises ?? [];

  // Local state: per-exercise array of sets
  const [localSets, setLocalSets] = useState<Record<number, LocalSet[]>>({});
  const [restEditing, setRestEditing] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [exercises, setExercises] = useState<
    { id: number; name: string; muscleGroup: string; type?: string }[]
  >([]);

  // Initialize local sets from planExercises
  useEffect(() => {
    const init: Record<number, LocalSet[]> = {};
    for (const pe of planExercises) {
      if (!localSets[pe.id]) {
        init[pe.id] = Array.from({ length: pe.plannedSets }, () => ({
          reps: pe.plannedReps,
          weight: pe.plannedWeight ?? 0,
        }));
      }
    }
    if (Object.keys(init).length > 0) {
      setLocalSets((prev) => ({ ...init, ...prev }));
    }
  }, [planExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSet = (peId: number, idx: number, data: Partial<LocalSet>) => {
    setLocalSets((prev) => {
      const sets = [...(prev[peId] ?? [])];
      sets[idx] = { ...sets[idx], ...data };
      return { ...prev, [peId]: sets };
    });
  };

  const handleAddSet = (peId: number) => {
    startTransition(async () => {
      await addSetToPlan(peId);
    });
    setLocalSets((prev) => {
      const sets = prev[peId] ?? [];
      const last = sets[sets.length - 1] ?? { reps: 10, weight: 0 };
      return { ...prev, [peId]: [...sets, { ...last }] };
    });
  };

  const handleRemoveSet = (peId: number, idx: number) => {
    const sets = localSets[peId] ?? [];
    if (sets.length <= 1) return;
    startTransition(async () => {
      await removeSetFromPlan(peId);
    });
    setLocalSets((prev) => ({
      ...prev,
      [peId]: (prev[peId] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveExercise = (peId: number) => {
    startTransition(async () => {
      await removeExerciseFromPlan(workout.id, peId);
    });
    setLocalSets((prev) => {
      const next = { ...prev };
      delete next[peId];
      return next;
    });
    // Remove from planExercises in parent would need refetch — we just hide it
    // by filtering in render
  };

  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const handleRemoveExerciseUI = (peId: number) => {
    setRemovedIds((prev) => new Set(prev).add(peId));
    handleRemoveExercise(peId);
  };

  const handleRestChange = (peId: number, seconds: number) => {
    startTransition(async () => {
      await updateRestSeconds(peId, seconds);
    });
    setRestEditing(null);
  };

  const handleAddExercise = useCallback(
    (exercise: { id: number; name: string; muscleGroup: string }) => {
      startTransition(async () => {
        const res = await addExerciseToPlan(workout.id, exercise.id);
        if (res.planExercise) {
          const pe = res.planExercise;
          setLocalSets((prev) => ({
            ...prev,
            [pe.id]: Array.from({ length: pe.plannedSets }, () => ({
              reps: pe.plannedReps,
              weight: pe.plannedWeight ?? 0,
            })),
          }));
        }
      });
      setShowPicker(false);
    },
    [workout.id],
  );

  const loadExercises = useCallback(async () => {
    const list = await getExercises();
    if (list) {
      setExercises(list as { id: number; name: string; muscleGroup: string; type?: string }[]);
    }
  }, []);

  const handleStart = () => {
    const overrides = planExercises
      .filter((pe) => !removedIds.has(pe.id))
      .map((pe) => ({
        planExerciseId: pe.id,
        sets: localSets[pe.id] ?? [],
      }));
    onStart(overrides);
  };

  const visibleExercises = planExercises.filter((pe) => !removedIds.has(pe.id));

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const REST_OPTIONS = [60, 90, 120, 150, 180];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/workouts')}
          className="text-accent text-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Назад
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            confirmDelete ? 'bg-danger text-white' : 'text-danger hover:bg-danger/15'
          }`}
        >
          {isPending ? '...' : confirmDelete ? 'Точно удалить?' : '🗑 Удалить'}
        </button>
      </div>

      {/* Badge */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span>📋</span>
          <span className="text-sm font-medium text-accent">План от AI тренера</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text font-semibold">{workout.type}</span>
          <span className="text-text-secondary text-xs">
            {formatDate(workout.date)}
          </span>
        </div>
      </div>

      {/* Exercise cards */}
      {visibleExercises.map((pe) => {
        const sets = localSets[pe.id] ?? [];
        const exId = pe.exerciseId;
        const last = exId ? lastWeights[exId] : null;
        const exType = pe.exercise?.type || 'strength';
        const isStrengthLike = exType === 'strength' || exType === 'bodyweight';

        return (
          <div key={pe.id} className="bg-card rounded-2xl p-4 space-y-3">
            {/* Exercise header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text font-medium text-sm">
                  {pe.exercise?.name ?? pe.exerciseName}
                </span>
                <span className="text-text-secondary text-xs ml-2">
                  {pe.exercise?.muscleGroup ?? ''}
                </span>
              </div>
              <button
                onClick={() => handleRemoveExerciseUI(pe.id)}
                className="text-text-secondary hover:text-danger transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Sets table */}
            <div className="space-y-2">
              {/* Header row */}
              {exType === 'timed' ? (
                <div className="flex items-center gap-2 text-text-secondary text-xs px-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1 text-center">Длительность (сек)</span>
                  <span className="w-7" />
                </div>
              ) : exType === 'cardio' ? (
                <div className="flex items-center gap-2 text-text-secondary text-xs px-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1 text-center">Длит.(мин)</span>
                  <span className="w-4" />
                  <span className="flex-1 text-center">Скор.(км/ч)</span>
                  <span className="w-7" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-text-secondary text-xs px-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1 text-center">Повт.</span>
                  <span className="w-4" />
                  <span className="flex-1 text-center">{exType === 'bodyweight' ? 'Утяж. кг' : 'Вес кг'}</span>
                  <span className="w-7" />
                </div>
              )}

              {sets.map((set, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-text-secondary text-xs w-6 text-center">
                    {idx + 1}
                  </span>
                  {exType === 'timed' ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps || ''}
                      placeholder="сек"
                      onChange={(e) =>
                        updateSet(pe.id, idx, { reps: parseInt(e.target.value) || 0 })
                      }
                      className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text text-center focus:border-accent outline-none"
                    />
                  ) : (
                    <>
                      <input
                        type="number"
                        inputMode={exType === 'cardio' ? 'decimal' : 'numeric'}
                        value={set.reps || ''}
                        placeholder={exType === 'cardio' ? 'мин' : '0'}
                        onChange={(e) =>
                          updateSet(pe.id, idx, { reps: parseInt(e.target.value) || 0 })
                        }
                        className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text text-center focus:border-accent outline-none"
                      />
                      <span className="text-text-secondary text-xs w-4 text-center">
                        {exType === 'cardio' ? '|' : '×'}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={exType === 'bodyweight' ? (set.weight || '') : (set.weight || '')}
                        placeholder={exType === 'bodyweight' ? '—' : '0'}
                        onChange={(e) =>
                          updateSet(pe.id, idx, {
                            weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text text-center focus:border-accent outline-none"
                      />
                    </>
                  )}
                  <button
                    onClick={() => handleRemoveSet(pe.id, idx)}
                    disabled={sets.length <= 1}
                    className="text-text-secondary hover:text-danger disabled:opacity-30 transition-colors p-1 w-7 flex justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add set */}
            <button
              onClick={() => handleAddSet(pe.id)}
              className="text-accent text-xs hover:text-accent/80 transition-colors"
            >
              + Подход
            </button>

            {/* Last weight hint */}
            {last && isStrengthLike && (
              <p className="text-text-secondary text-xs">
                Последний раз: {last.weight} кг, {last.reps} повт. ({formatDate(last.date)})
              </p>
            )}

            {/* Rest time */}
            <div className="pt-1 border-t border-border/50">
              {restEditing === pe.id ? (
                <div className="flex flex-wrap gap-1.5">
                  {REST_OPTIONS.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleRestChange(pe.id, sec)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        (pe.restSeconds ?? 90) === sec
                          ? 'bg-accent text-white'
                          : 'bg-bg text-text-secondary hover:text-text'
                      }`}
                    >
                      {sec}с
                    </button>
                  ))}
                  <button
                    onClick={() => setRestEditing(null)}
                    className="px-2 py-1 text-xs text-text-secondary hover:text-text"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRestEditing(pe.id)}
                  className="text-text-secondary text-xs hover:text-text transition-colors"
                >
                  Отдых: {pe.restSeconds ?? 90}с
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add exercise */}
      <button
        onClick={() => {
          loadExercises();
          setShowPicker(true);
        }}
        className="w-full bg-card hover:bg-card-hover border border-border border-dashed rounded-2xl py-3 text-accent text-sm transition-colors"
      >
        + Добавить упражнение
      </button>

      {/* Sticky start button */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleStart}
            disabled={isPending || visibleExercises.length === 0}
            className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-base font-semibold transition-colors disabled:opacity-50 shadow-lg"
          >
            {isPending ? 'Запуск...' : 'Начать тренировку'}
          </button>
        </div>
      </div>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          onSelect={handleAddExercise}
          onCreateNew={async (data) => {
            const res = await createExerciseFromWorkout(data);
            if (res.exercise) {
              setExercises((prev) => [...prev, res.exercise as { id: number; name: string; muscleGroup: string }]);
              return res.exercise as { id: number; name: string; muscleGroup: string };
            }
            return null;
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Completed/Default View ───

function CompletedView({
  workout,
  onDelete,
  isPending,
  confirmDelete,
}: {
  workout: WorkoutDetail;
  onDelete: () => void;
  isPending: boolean;
  confirmDelete: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateMsg, setTemplateMsg] = useState('');

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getExType = (ex: { type?: string }) => ex.type || 'strength';

  const groupByExercise = (sets: WorkoutSet[]) => {
    const groups: { exercise: WorkoutSet['exercise']; sets: WorkoutSet[] }[] = [];
    let currentExId = -1;
    for (const set of sets) {
      if (set.exercise.id !== currentExId) {
        groups.push({ exercise: set.exercise, sets: [] });
        currentExId = set.exercise.id;
      }
      groups[groups.length - 1].sets.push(set);
    }
    return groups;
  };

  const groups = groupByExercise(workout.sets);
  const strengthSets = workout.sets.filter((s) => {
    const t = getExType(s.exercise);
    return t === 'strength' || t === 'bodyweight';
  });
  const totalVolume = strengthSets.reduce((sum, s) => sum + s.reps * s.weight, 0);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/workouts')}
          className="text-accent text-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Назад
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            confirmDelete ? 'bg-danger text-white' : 'text-danger hover:bg-danger/15'
          }`}
        >
          {isPending ? '...' : confirmDelete ? 'Точно удалить?' : 'Удалить'}
        </button>
      </div>

      <div className="bg-card rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-bold text-text">{workout.type}</h1>
          <span className="text-text-secondary text-sm">{formatDate(workout.date)}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-text-secondary text-sm">
          {workout.durationMin != null && workout.durationMin > 0 && <span>{workout.durationMin} мин</span>}
          <span>{groups.length} упр.</span>
          <span>{workout.sets.length} подх.</span>
          {totalVolume > 0 && <span>{totalVolume.toLocaleString('ru-RU')} кг</span>}
        </div>
        {workout.startedAt && (
          <div className="flex gap-2 text-text-secondary text-xs mt-2">
            <span>
              {new Date(workout.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              {workout.endedAt && ` — ${new Date(workout.endedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        )}
        {workout.note && <p className="text-text-secondary text-sm mt-3">{workout.note}</p>}
      </div>

      {groups.map((group, idx) => {
        const exType = getExType(group.exercise);
        return (
          <div key={idx} className="bg-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text font-medium text-sm">{group.exercise.name}</span>
              <span className="text-text-secondary text-xs">{group.exercise.muscleGroup}</span>
            </div>
            {exType === 'cardio' ? (
              <div className="space-y-1.5">
                {group.sets.map((set, setIdx) => {
                  const parts: string[] = [];
                  if (set.duration) parts.push(`${set.duration} мин`);
                  if (set.distance) parts.push(`${set.distance} км`);
                  if (set.speed) parts.push(`${set.speed} км/ч`);
                  if (set.incline) parts.push(`наклон ${set.incline}%`);
                  if (set.heartRate) parts.push(`пульс ${set.heartRate}`);
                  return (
                    <div key={setIdx} className="flex flex-wrap gap-2 text-sm">
                      {parts.map((part, i) => (
                        <span key={i} className="bg-bg text-text px-2 py-0.5 rounded-md text-xs">{part}</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : exType === 'timed' ? (
              <div className="space-y-1.5">
                {group.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-3 text-sm">
                    <span className="text-text-secondary w-6 text-center text-xs">{setIdx + 1}</span>
                    <span className="text-text">{set.duration ?? 0} сек</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {group.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-3 text-sm">
                    <span className="text-text-secondary w-6 text-center text-xs">{setIdx + 1}</span>
                    <span className="text-text">{set.reps} повт.</span>
                    {(exType === 'strength' || set.weight > 0) && (
                      <>
                        <span className="text-text-secondary">×</span>
                        <span className="text-text">
                          {exType === 'bodyweight' && set.weight > 0 ? `+${set.weight}` : set.weight} кг
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!showTemplateForm ? (
        <button
          onClick={() => {
            setTemplateName(workout.type);
            setShowTemplateForm(true);
          }}
          className="w-full bg-card hover:bg-card-hover border border-border border-dashed rounded-2xl py-3 text-accent text-sm transition-colors"
        >
          Сохранить как шаблон
        </button>
      ) : (
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <label className="text-text-secondary text-sm block">Название шаблона</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Например: Грудь + трицепс"
            className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent outline-none"
            autoFocus
          />
          {templateMsg && (
            <p className={`text-sm ${templateMsg.includes('!') ? 'text-green-500' : 'text-danger'}`}>
              {templateMsg}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                startTransition(async () => {
                  const result = await createTemplateFromWorkout(parseInt(String(workout.id)), templateName);
                  if (result.error) {
                    setTemplateMsg(result.error);
                  } else {
                    setTemplateMsg('Шаблон сохранён!');
                    setTimeout(() => {
                      setShowTemplateForm(false);
                      setTemplateMsg('');
                    }, 1500);
                  }
                });
              }}
              disabled={isPending}
              className="flex-1 bg-accent text-white text-sm font-medium py-2 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isPending ? '...' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                setShowTemplateForm(false);
                setTemplateMsg('');
              }}
              className="text-text-secondary text-sm px-4 py-2 hover:text-text"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [lastWeights, setLastWeights] = useState<Record<number, LastWeight>>({});
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const workoutId = parseInt(id);
    // Load basic workout first, then plan data if planned
    getWorkout(workoutId).then((result) => {
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.workout) return;
      const w = result.workout as unknown as WorkoutDetail;
      setWorkout(w);

      if (w.status === 'planned') {
        getWorkoutWithPlan(workoutId).then((planResult) => {
          if (planResult.workout) {
            setWorkout(planResult.workout as unknown as WorkoutDetail);
          }
          if (planResult.lastWeights) {
            setLastWeights(planResult.lastWeights as unknown as Record<number, LastWeight>);
          }
        });
      }
    });
  }, [id]);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteWorkout(parseInt(id));
      router.push('/workouts');
    });
  };

  const handleStartPlanned = (overrides: { planExerciseId: number; sets: LocalSet[] }[]) => {
    startTransition(async () => {
      const res = await startPlannedWorkout(parseInt(id), overrides);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push('/workouts/active');
    });
  };

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <p className="text-danger text-sm">{error}</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <p className="text-text-secondary text-sm text-center py-8">Загрузка...</p>
      </div>
    );
  }

  if (workout.status === 'planned') {
    return (
      <PlanPreview
        workout={workout}
        lastWeights={lastWeights}
        onStart={handleStartPlanned}
        onDelete={handleDelete}
        isPending={isPending}
        confirmDelete={confirmDelete}
      />
    );
  }

  return (
    <CompletedView
      workout={workout}
      onDelete={handleDelete}
      isPending={isPending}
      confirmDelete={confirmDelete}
    />
  );
}
