'use client';

import { Suspense, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createWorkout, createExerciseFromWorkout } from '../actions';
import { getExercises } from '../../exercises/actions';
import { getTemplate } from '../templates/actions';
import SetInput from '@/components/workout/set-input';
import CardioSetInput, { CardioSetData } from '@/components/workout/cardio-set-input';
import ExercisePicker from '@/components/workout/exercise-picker';
import RestTimer from '@/components/workout/rest-timer';

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  type?: string;
}

interface StrengthSet {
  reps: number;
  weight: number;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: StrengthSet[];
  cardio?: CardioSetData;
}

const workoutTypes = ['Силовая', 'Кардио', 'Растяжка', 'Своё'];

function isCardioExercise(exercise: Exercise): boolean {
  return exercise.type === 'cardio' || exercise.muscleGroup === 'Кардио';
}

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto p-4 text-text-secondary text-sm text-center py-8">Загрузка...</div>}>
      <NewWorkoutContent />
    </Suspense>
  );
}

function NewWorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState('Силовая');
  const [durationMin, setDurationMin] = useState('');
  const [note, setNote] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [error, setError] = useState('');

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId && !templateLoaded) {
      setTemplateLoaded(true);
      getTemplate(parseInt(templateId)).then((result) => {
        if (result.template) {
          const t = result.template;
          setWorkoutExercises(
            t.exercises.map((te: { exercise: Exercise; sets: number; reps: number; weight: number }) => ({
              exercise: te.exercise,
              sets: Array.from({ length: te.sets }, () => ({
                reps: te.reps,
                weight: te.weight,
              })),
              ...(isCardioExercise(te.exercise) ? {
                cardio: { duration: 0, distance: 0, speed: 0, incline: 0, heartRate: 0 }
              } : {}),
            }))
          );
        }
      });
    }
  }, [searchParams, templateLoaded]);

  const handleSelectExercise = (exercise: Exercise) => {
    if (isCardioExercise(exercise)) {
      setWorkoutExercises((prev) => [
        ...prev,
        {
          exercise,
          sets: [],
          cardio: { duration: 0, distance: 0, speed: 0, incline: 0, heartRate: 0 },
        },
      ]);
    } else {
      setWorkoutExercises((prev) => [
        ...prev,
        { exercise, sets: [{ reps: 0, weight: 0 }] },
      ]);
    }
    setShowPicker(false);
  };

  const handleCreateExercise = async (data: { name: string; muscleGroup: string }): Promise<Exercise | null> => {
    const result = await createExerciseFromWorkout(data);
    if ('error' in result && result.error) {
      return null;
    }
    if (result.exercise) {
      setAllExercises((prev) => [...prev, result.exercise!]);
      return result.exercise;
    }
    return null;
  };

  const updateSet = (exIdx: number, setIdx: number, data: { reps: number; weight: number }) => {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.map((s, i) => (i === setIdx ? data : s)),
      };
      return next;
    });
  };

  const updateCardio = (exIdx: number, data: CardioSetData) => {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], cardio: data };
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      const lastSet = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, { reps: lastSet?.reps || 0, weight: lastSet?.weight || 0 }],
      };
      return next;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  };

  const removeExercise = (exIdx: number) => {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const handleSave = () => {
    if (workoutExercises.length === 0) {
      setError('Добавьте хотя бы одно упражнение');
      setTimeout(() => setError(''), 3000);
      return;
    }

    for (const ex of workoutExercises) {
      if (isCardioExercise(ex.exercise)) {
        if (!ex.cardio?.duration || ex.cardio.duration <= 0) {
          setError(`Укажите длительность для "${ex.exercise.name}"`);
          setTimeout(() => setError(''), 3000);
          return;
        }
      } else {
        for (const set of ex.sets) {
          if (set.reps <= 0) {
            setError(`Укажите повторения для "${ex.exercise.name}"`);
            setTimeout(() => setError(''), 3000);
            return;
          }
        }
      }
    }

    startTransition(async () => {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const result = await createWorkout({
        date: dateStr,
        type,
        durationMin: durationMin ? parseInt(durationMin) : undefined,
        note: note || undefined,
        exercises: workoutExercises.map((we) => {
          if (isCardioExercise(we.exercise) && we.cardio) {
            return {
              exerciseId: we.exercise.id,
              isCardio: true,
              cardio: we.cardio,
              sets: [],
            };
          }
          return {
            exerciseId: we.exercise.id,
            sets: we.sets,
          };
        }),
      });

      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 3000);
        return;
      }

      router.push(`/workouts/${result.id}`);
    });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Новая тренировка</h1>
        <button
          onClick={() => router.back()}
          className="text-text-secondary text-sm hover:text-text"
        >
          Отмена
        </button>
      </div>

      {error && (
        <div className="bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-text-secondary text-sm mb-2 block">Тип тренировки</label>
          <div className="flex flex-wrap gap-2">
            {workoutTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 text-sm rounded-xl transition-colors ${
                  type === t ? 'bg-accent text-white' : 'bg-bg text-text-secondary hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-sm mb-2 block">Длительность (мин)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Необязательно"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="text-text-secondary text-sm mb-2 block">Заметка</label>
          <textarea
            placeholder="Необязательно"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent outline-none resize-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Упражнения</h2>

        {workoutExercises.map((we, exIdx) => (
          <div key={exIdx} className="bg-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text font-medium text-sm">{we.exercise.name}</span>
                <span className="text-text-secondary text-xs ml-2">{we.exercise.muscleGroup}</span>
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                className="text-text-secondary hover:text-danger transition-colors text-xs"
              >
                Удалить
              </button>
            </div>

            {isCardioExercise(we.exercise) && we.cardio ? (
              <CardioSetInput
                data={we.cardio}
                onChange={(data) => updateCardio(exIdx, data)}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-text-secondary text-xs px-1">
                    <span className="w-6 text-center">#</span>
                    <span className="flex-1 text-center">Повт.</span>
                    <span className="w-3" />
                    <span className="flex-1 text-center">Вес</span>
                    <span className="w-6" />
                    <span className="w-5" />
                  </div>
                  {we.sets.map((set, setIdx) => (
                    <SetInput
                      key={setIdx}
                      index={setIdx}
                      data={set}
                      onChange={(data) => updateSet(exIdx, setIdx, data)}
                      onRemove={() => removeSet(exIdx, setIdx)}
                      canRemove={we.sets.length > 1}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => addSet(exIdx)}
                    className="flex-1 text-accent text-sm py-1.5 hover:bg-accent/10 rounded-lg transition-colors"
                  >
                    + Подход
                  </button>
                  <button
                    onClick={() => setShowTimer(true)}
                    className="text-text-secondary text-sm py-1.5 px-3 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1 -mt-0.5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                    </svg>
                    Отдых
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full bg-card hover:bg-card-hover border border-border border-dashed rounded-2xl py-4 text-accent text-sm transition-colors"
        >
          + Добавить упражнение
        </button>
      </div>

      {showTimer && (
        <RestTimer onClose={() => setShowTimer(false)} />
      )}

      <button
        onClick={handleSave}
        disabled={isPending || workoutExercises.length === 0}
        className="w-full bg-accent text-white font-semibold py-3.5 rounded-2xl disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Сохранение...' : 'Сохранить тренировку'}
      </button>

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
