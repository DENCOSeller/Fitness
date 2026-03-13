'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  startWorkout, getActiveWorkout, addExerciseToWorkout,
  addSetToWorkout, updateSet, completeSet, finishWorkout, discardWorkout,
} from './actions';
import { getExercises } from '../../exercises/actions';
import { createExerciseFromWorkout } from '../actions';
import ExercisePicker from '@/components/workout/exercise-picker';
import RestTimer from '@/components/workout/rest-timer';

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  type?: string;
}

interface SetData {
  id: number;
  exerciseId: number;
  setOrder: number;
  reps: number;
  weight: number;
  completed: boolean;
  exercise: Exercise;
}

interface PlanExData {
  exerciseId: number | null;
  plannedSets: number;
  plannedReps: number;
  plannedWeight: number | null;
  restSeconds: number | null;
}

interface WorkoutData {
  id: number;
  type: string;
  startedAt: string | null;
  sets: SetData[];
  planExercises?: PlanExData[];
}

interface ExGroup {
  exercise: Exercise;
  sets: SetData[];
  allDone: boolean;
}

const TYPES = ['Силовая', 'Кардио', 'Растяжка', 'Своё'];

function formatTimer(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function groupSets(sets: SetData[]): ExGroup[] {
  const groups: ExGroup[] = [];
  let curId = -1;
  for (const set of sets) {
    if (set.exercise.id !== curId) {
      groups.push({ exercise: set.exercise, sets: [], allDone: true });
      curId = set.exercise.id;
    }
    const g = groups[groups.length - 1];
    g.sets.push(set);
    if (!set.completed) g.allDone = false;
  }
  return groups;
}

function exerciseSummary(sets: SetData[]): string {
  if (sets.length === 0) return '';
  const weights = [...new Set(sets.map(s => s.weight))];
  if (weights.length === 1) {
    const reps = sets.map(s => s.reps).join('/');
    return `${sets.length}x${reps} ${weights[0]}кг`;
  }
  return sets.map(s => `${s.reps}x${s.weight}`).join(', ');
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [selectedType, setSelectedType] = useState('Силовая');
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState('');
  const [localEdits, setLocalEdits] = useState<Record<number, { reps: number; weight: number }>>({});
  const [planData, setPlanData] = useState<Map<number, { plannedSets: number; plannedReps: number; plannedWeight: number; restSeconds: number }>>(new Map());
  const [timerSeconds, setTimerSeconds] = useState(90);

  // Load active workout
  useEffect(() => {
    Promise.all([getActiveWorkout(), getExercises()]).then(([res, exercises]) => {
      if (res.workout) {
        const w = res.workout as unknown as WorkoutData;
        setWorkout(w);
        // Build planData map: exerciseId → plan info
        if (w.planExercises && w.planExercises.length > 0) {
          const m = new Map<number, { plannedSets: number; plannedReps: number; plannedWeight: number; restSeconds: number }>();
          for (const pe of w.planExercises) {
            if (pe.exerciseId != null) {
              m.set(pe.exerciseId, {
                plannedSets: pe.plannedSets,
                plannedReps: pe.plannedReps,
                plannedWeight: pe.plannedWeight ?? 0,
                restSeconds: pe.restSeconds ?? 90,
              });
            }
          }
          setPlanData(m);
        }
      }
      setAllExercises(exercises as Exercise[]);
      setLoading(false);
    });
  }, []);

  // Live timer — Date.now() based, survives tab throttling
  useEffect(() => {
    if (!workout?.startedAt) return;
    const startMs = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout?.startedAt]);

  // Auto-collapse completed exercises
  useEffect(() => {
    if (!workout) return;
    const groups = groupSets(workout.sets);
    setCollapsed(prev => {
      const next = new Set(prev);
      groups.forEach(g => { if (g.allDone && g.sets.length > 0) next.add(g.exercise.id); });
      return next;
    });
  }, [workout]);

  const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 3000); };

  const getVal = (set: SetData, field: 'reps' | 'weight'): number | string => {
    const edited = localEdits[set.id]?.[field];
    if (edited !== undefined && edited !== null) return edited;
    const orig = set[field];
    if (orig !== undefined && orig !== null && orig !== 0) return orig;
    // Fallback to plan data
    const plan = planData.get(set.exerciseId);
    if (plan) {
      const planVal = field === 'reps' ? plan.plannedReps : plan.plannedWeight;
      if (planVal !== undefined && planVal !== null && planVal !== 0) return planVal;
    }
    return '';
  };

  const setLocal = (setId: number, field: 'reps' | 'weight', value: number, orig: SetData) => {
    setLocalEdits(prev => ({
      ...prev,
      [setId]: {
        reps: field === 'reps' ? value : (prev[setId]?.reps ?? orig.reps),
        weight: field === 'weight' ? value : (prev[setId]?.weight ?? orig.weight),
      },
    }));
  };

  const reloadWorkout = async () => {
    const res = await getActiveWorkout();
    if (res.workout) setWorkout(res.workout as unknown as WorkoutData);
  };

  // --- Actions ---

  const handleStart = () => {
    startTransition(async () => {
      const res = await startWorkout(selectedType);
      if (res.error) {
        if ('workoutId' in res && res.workoutId) await reloadWorkout();
        else showErr(res.error);
        return;
      }
      if (res.workout) setWorkout(res.workout as unknown as WorkoutData);
    });
  };

  const handleSelectExercise = (ex: Exercise) => {
    if (!workout) return;
    setShowPicker(false);
    startTransition(async () => {
      const res = await addExerciseToWorkout(workout.id, ex.id);
      if (res.error) { showErr(res.error); return; }
      await reloadWorkout();
    });
  };

  const handleCreateExercise = async (data: { name: string; muscleGroup: string }): Promise<Exercise | null> => {
    const res = await createExerciseFromWorkout(data);
    if ('error' in res && res.error) return null;
    if (res.exercise) {
      setAllExercises(prev => [...prev, res.exercise!]);
      return res.exercise as Exercise;
    }
    return null;
  };

  const handleAddSet = (exerciseId: number) => {
    if (!workout) return;
    const exSets = workout.sets.filter(s => s.exercise.id === exerciseId);
    const last = exSets[exSets.length - 1];
    const vals = localEdits[last?.id] || { reps: last?.reps || 0, weight: last?.weight || 0 };
    startTransition(async () => {
      const res = await addSetToWorkout(workout.id, exerciseId, vals);
      if (res.error) { showErr(res.error); return; }
      await reloadWorkout();
    });
  };

  const handleCompleteSet = (set: SetData) => {
    // Resolve values: localEdits → original → plan fallback
    const plan = planData.get(set.exerciseId);
    const reps = localEdits[set.id]?.reps ?? (set.reps || plan?.plannedReps || 0);
    const weight = localEdits[set.id]?.weight ?? (set.weight || plan?.plannedWeight || 0);
    const vals = { reps, weight };
    if (vals.reps <= 0) { showErr('Укажите повторения'); return; }
    startTransition(async () => {
      await updateSet(set.id, vals);
      await completeSet(set.id);
      setWorkout(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sets: prev.sets.map(s =>
            s.id === set.id ? { ...s, ...vals, completed: true } : s
          ),
        };
      });
      setLocalEdits(prev => { const next = { ...prev }; delete next[set.id]; return next; });
      // Use plan rest time if available
      const restSec = plan?.restSeconds ?? 90;
      setTimerSeconds(restSec);
      setShowTimer(true);
    });
  };

  const handleFinish = () => {
    if (!confirmFinish) { setConfirmFinish(true); setTimeout(() => setConfirmFinish(false), 3000); return; }
    if (!workout) return;
    startTransition(async () => {
      const res = await finishWorkout(workout.id);
      if (res.error) { showErr(res.error); return; }
      router.push(`/workouts/${workout.id}`);
    });
  };

  const handleDiscard = () => {
    if (!confirmDiscard) { setConfirmDiscard(true); setTimeout(() => setConfirmDiscard(false), 3000); return; }
    if (!workout) return;
    startTransition(async () => {
      await discardWorkout(workout.id);
      router.push('/workouts');
    });
  };

  const toggleCollapse = (id: number) => {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // --- Render ---

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-text-secondary text-sm">Загрузка...</p></div>;
  }

  // Start screen
  if (!workout) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">Начать тренировку</h1>
          <p className="text-text-secondary text-sm">Выберите тип и начните</p>
        </div>
        {error && <div className="bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map(t => (
            <button key={t} onClick={() => setSelectedType(t)}
              className={`p-4 rounded-2xl text-sm font-medium transition-all ${selectedType === t ? 'bg-accent text-white glow-accent' : 'bg-card text-text-secondary hover:text-text'}`}
            >{t}</button>
          ))}
        </div>
        <button onClick={handleStart} disabled={isPending} className="btn-gradient w-full py-4 text-base">
          {isPending ? 'Запуск...' : 'Начать тренировку'}
        </button>
        <button onClick={() => router.push('/workouts')} className="w-full text-text-secondary text-sm py-2 hover:text-text transition-colors">
          Назад к журналу
        </button>
      </div>
    );
  }

  // Active workout
  const groups = groupSets(workout.sets);
  const completedSets = workout.sets.filter(s => s.completed).length;

  return (
    <div className="min-h-screen pb-[160px] overflow-x-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text truncate">{workout.type}</h1>
            <span className="text-xs text-text-secondary">{completedSets}/{workout.sets.length} подх.</span>
          </div>
          <div className="text-2xl font-bold text-accent tabular-nums tracking-tight">
            {formatTimer(elapsed)}
          </div>
          <button onClick={handleDiscard}
            className={`ml-3 text-xs px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 ${confirmDiscard ? 'bg-danger text-white' : 'text-text-secondary hover:text-danger'}`}
          >{confirmDiscard ? 'Точно?' : '✕'}</button>
        </div>
      </div>

      {error && (
        <div className="max-w-lg mx-auto px-4 mt-3">
          <div className="bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl">{error}</div>
        </div>
      )}

      {/* Exercise list */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {groups.length === 0 && (
          <div className="text-center py-12 text-text-secondary text-sm">Добавьте первое упражнение</div>
        )}

        {groups.map(group => {
          const isCollapsed = collapsed.has(group.exercise.id);
          return (
            <div key={group.exercise.id} className={`rounded-2xl overflow-hidden ${group.allDone && group.sets.length > 0 ? 'bg-card/60' : 'bg-card border border-border'}`}>
              {/* Exercise header — tap to toggle */}
              <button onClick={() => toggleCollapse(group.exercise.id)} className="w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {group.allDone && group.sets.length > 0 && (
                    <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-text font-medium text-sm truncate">{group.exercise.name}</span>
                  <span className="text-text-secondary text-xs flex-shrink-0">{group.exercise.muscleGroup}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCollapsed && <span className="text-text-secondary text-xs">{exerciseSummary(group.sets)}</span>}
                  <svg className={`w-4 h-4 text-text-secondary transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {/* Sets */}
              {!isCollapsed && (
                <div className="pb-4 space-y-2 overflow-hidden">
                  {/* Plan hint */}
                  {planData.has(group.exercise.id) && (() => {
                    const p = planData.get(group.exercise.id)!;
                    return (
                      <div className="px-4 pb-1 text-xs text-gray-500">
                        План: {p.plannedSets} × {p.plannedReps} повт.{p.plannedWeight ? ` × ${p.plannedWeight} кг` : ''}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs px-3 overflow-hidden">
                    <span className="w-5 shrink-0 text-center">#</span>
                    <span className="flex-1 min-w-0 text-center">Повт.</span>
                    <span className="shrink-0 px-0.5" />
                    <span className="flex-1 min-w-0 text-center">Вес (кг)</span>
                    <span className="w-10 shrink-0" />
                  </div>

                  {group.sets.map((set, idx) => (
                    <div key={set.id} className={`flex items-center gap-1.5 px-2 overflow-hidden ${set.completed ? 'opacity-40' : ''}`}>
                      <span className="w-5 shrink-0 text-text-secondary text-xs text-center">{idx + 1}</span>
                      <input type="number" inputMode="numeric" placeholder="0"
                        value={getVal(set, 'reps')} disabled={set.completed}
                        onChange={e => setLocal(set.id, 'reps', parseInt(e.target.value) || 0, set)}
                        className="flex-1 min-w-0 bg-bg border border-border rounded-lg px-1 py-1.5 text-sm text-text text-center focus:border-accent outline-none disabled:opacity-50"
                      />
                      <span className="shrink-0 text-text-secondary text-xs px-0.5">x</span>
                      <input type="number" inputMode="decimal" placeholder="0"
                        value={getVal(set, 'weight')} disabled={set.completed}
                        onChange={e => setLocal(set.id, 'weight', parseFloat(e.target.value) || 0, set)}
                        className="flex-1 min-w-0 bg-bg border border-border rounded-lg px-1 py-1.5 text-sm text-text text-center focus:border-accent outline-none disabled:opacity-50"
                      />
                      {set.completed ? (
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <button onClick={() => handleCompleteSet(set)}
                          disabled={isPending}
                          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1 px-2">
                    <button onClick={() => handleAddSet(group.exercise.id)} disabled={isPending}
                      className="flex-1 text-accent text-sm py-2 hover:bg-accent/10 rounded-lg transition-colors">
                      + Подход
                    </button>
                    <button onClick={() => setShowTimer(true)}
                      className="text-text-secondary text-sm py-2 px-3 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                      </svg>
                      Отдых
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={() => setShowPicker(true)}
          className="w-full bg-card hover:bg-card-hover border border-border border-dashed rounded-2xl py-4 text-accent text-sm transition-colors">
          + Добавить упражнение
        </button>
      </div>

      {/* Rest timer overlay */}
      <RestTimer isOpen={showTimer} onClose={() => setShowTimer(false)} defaultSeconds={timerSeconds} />

      {/* Sticky finish button */}
      <div className="fixed left-0 right-0 z-50 bg-bg/95 backdrop-blur-sm border-t border-border" style={{ bottom: '83px' }}>
        <div className="max-w-lg mx-auto px-4 py-3">
          <button onClick={handleFinish} disabled={isPending || workout.sets.length === 0}
            className={`w-full py-3.5 text-base font-semibold rounded-2xl transition-all ${confirmFinish ? 'bg-success text-white' : 'btn-gradient'}`}
          >
            {isPending ? 'Сохранение...' : confirmFinish ? 'Подтвердить завершение' : 'Завершить тренировку'}
          </button>
        </div>
      </div>

      {/* Exercise picker */}
      {showPicker && (
        <ExercisePicker
          exercises={allExercises}
          onSelect={handleSelectExercise}
          onCreateNew={handleCreateExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
