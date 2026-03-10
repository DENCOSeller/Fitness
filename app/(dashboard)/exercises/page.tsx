'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { getExercises, createExercise, deleteExercise } from './actions';

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  _count: { workoutSets: number };
};

const muscleGroups = [
  'Грудь',
  'Спина',
  'Плечи',
  'Бицепс',
  'Трицепс',
  'Ноги',
  'Пресс',
  'Кардио',
  'Растяжка',
  'Другое',
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(muscleGroups[0]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const list = await getExercises();
    setExercises(list);
  }

  function handleCreate() {
    setError('');
    startTransition(async () => {
      const result = await createExercise({ name, muscleGroup });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName('');
      setMuscleGroup(muscleGroups[0]);
      setShowForm(false);
      await loadExercises();
    });
  }

  function handleDelete(id: number, exerciseName: string) {
    startTransition(async () => {
      const result = await deleteExercise(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 3000);
        return;
      }
      await loadExercises();
    });
  }

  const filtered = exercises.filter((ex) => {
    const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !filterGroup || ex.muscleGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const groupsInUse = [...new Set(exercises.map((ex) => ex.muscleGroup))].sort();

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Упражнения</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium"
        >
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">Новое упражнение</h2>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Жим лёжа"
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Группа мышц</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text border border-border focus:border-accent focus:outline-none appearance-none"
            >
              {muscleGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || !name.trim()}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
          >
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию..."
        className="w-full bg-card rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none"
      />

      {/* Filter by muscle group */}
      {groupsInUse.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterGroup('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !filterGroup
                ? 'bg-accent text-white'
                : 'bg-card text-text-secondary'
            }`}
          >
            Все
          </button>
          {groupsInUse.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(g === filterGroup ? '' : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterGroup === g
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-secondary'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            {exercises.length === 0
              ? 'Упражнений пока нет. Добавьте первое!'
              : 'Ничего не найдено'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <div key={ex.id} className="bg-card rounded-2xl p-4 flex items-center justify-between">
              <Link href={`/exercises/${ex.id}`} className="flex-1 min-w-0">
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {ex.muscleGroup}
                  {ex._count.workoutSets > 0 && (
                    <span className="ml-2 text-accent">
                      {ex._count.workoutSets} {ex._count.workoutSets === 1 ? 'подход' : ex._count.workoutSets < 5 ? 'подхода' : 'подходов'}
                    </span>
                  )}
                </div>
              </Link>
              {ex._count.workoutSets === 0 ? (
                <button
                  onClick={() => handleDelete(ex.id, ex.name)}
                  disabled={isPending}
                  className="text-text-secondary hover:text-danger transition-colors p-2"
                  title="Удалить"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              ) : (
                <Link href={`/exercises/${ex.id}`} className="text-text-secondary p-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-text-secondary text-center pt-2">
        {exercises.length} {exercises.length === 1 ? 'упражнение' : exercises.length < 5 ? 'упражнения' : 'упражнений'}
        {filtered.length !== exercises.length && ` (показано ${filtered.length})`}
      </div>
    </div>
  );
}
