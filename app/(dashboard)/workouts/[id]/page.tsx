'use client';

import { useState, useEffect, useTransition, use } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkout, deleteWorkout } from '../actions';
import { createTemplateFromWorkout } from '../templates/actions';

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

interface WorkoutDetail {
  id: number;
  date: string | Date;
  type: string;
  durationMin: number | null;
  note: string | null;
  sets: WorkoutSet[];
}

function isCardioSet(set: WorkoutSet): boolean {
  return set.exercise.type === 'cardio' || set.exercise.muscleGroup === 'Кардио' || set.duration != null;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateMsg, setTemplateMsg] = useState('');

  useEffect(() => {
    getWorkout(parseInt(id)).then((result) => {
      if (result.error) {
        setError(result.error);
      } else if (result.workout) {
        setWorkout(result.workout as unknown as WorkoutDetail);
      }
    });
  }, [id]);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

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

  const groups = groupByExercise(workout.sets);
  const strengthSets = workout.sets.filter(s => !isCardioSet(s));
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
          onClick={handleDelete}
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

        <div className="flex gap-4 text-text-secondary text-sm">
          {workout.durationMin && <span>{workout.durationMin} мин</span>}
          <span>{groups.length} упр.</span>
          <span>{workout.sets.length} подх.</span>
          {totalVolume > 0 && <span>{totalVolume.toLocaleString('ru-RU')} кг</span>}
        </div>

        {workout.note && (
          <p className="text-text-secondary text-sm mt-3">{workout.note}</p>
        )}
      </div>

      {groups.map((group, idx) => {
        const isCardio = isCardioSet(group.sets[0]);

        return (
          <div key={idx} className="bg-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text font-medium text-sm">{group.exercise.name}</span>
              <span className="text-text-secondary text-xs">{group.exercise.muscleGroup}</span>
            </div>

            {isCardio ? (
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
                        <span key={i} className="bg-bg text-text px-2 py-0.5 rounded-md text-xs">
                          {part}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {group.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-3 text-sm">
                    <span className="text-text-secondary w-6 text-center text-xs">{setIdx + 1}</span>
                    <span className="text-text">{set.reps} повт.</span>
                    <span className="text-text-secondary">×</span>
                    <span className="text-text">{set.weight} кг</span>
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
                  const result = await createTemplateFromWorkout(parseInt(id), templateName);
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
