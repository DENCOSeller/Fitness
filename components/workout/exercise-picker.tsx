'use client';

import { useState } from 'react';

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  type?: string;
}

interface ExercisePickerProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCreateNew: (data: { name: string; muscleGroup: string }) => Promise<Exercise | null>;
  onClose: () => void;
}

const muscleGroups = [
  'Грудь', 'Спина', 'Плечи', 'Бицепс', 'Трицепс',
  'Ноги', 'Пресс', 'Кардио', 'Растяжка', 'Другое',
];

export default function ExercisePicker({ exercises, onSelect, onCreateNew, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Другое');
  const [creating, setCreating] = useState(false);

  const filtered = exercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = !filter || ex.muscleGroup === filter;
    return matchSearch && matchGroup;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const exercise = await onCreateNew({ name: newName.trim(), muscleGroup: newGroup });
    setCreating(false);
    if (exercise) {
      onSelect(exercise);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">Выбор упражнения</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-border">
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                !filter ? 'bg-accent text-white' : 'bg-bg text-text-secondary hover:text-text'
              }`}
            >
              Все
            </button>
            {muscleGroups.map((g) => (
              <button
                key={g}
                onClick={() => setFilter(filter === g ? '' : g)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  filter === g ? 'bg-accent text-white' : 'bg-bg text-text-secondary hover:text-text'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && !showCreate && (
            <div className="text-center py-8 text-text-secondary text-sm">
              <p>Ничего не найдено</p>
              <button
                onClick={() => {
                  setShowCreate(true);
                  setNewName(search);
                }}
                className="text-accent mt-2"
              >
                Создать новое
              </button>
            </div>
          )}
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-card-hover transition-colors flex items-center justify-between"
            >
              <span className="text-text text-sm">{ex.name}</span>
              <span className="text-text-secondary text-xs">{ex.muscleGroup}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          {showCreate ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Название упражнения"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent outline-none"
              />
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"
              >
                {muscleGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-bg text-text-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-accent text-white disabled:opacity-50"
                >
                  {creating ? 'Создание...' : 'Создать и выбрать'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-bg text-accent hover:bg-card-hover transition-colors"
            >
              + Создать новое упражнение
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
