'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { createMeal, getMealsByDate, deleteMeal, analyzeMeal, getDailyCalorieSummary } from './actions';

type Meal = {
  id: number;
  date: string;
  mealType: string;
  description: string | null;
  photoPath: string | null;
  aiAnalysis: string | null;
  calories: number | null;
  note: string | null;
  createdAt: string;
};

const mealTypes = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mealTypeLabel(value: string): string {
  return mealTypes.find((t) => t.value === value)?.label || value;
}

function mealTypeIcon(value: string): string {
  switch (value) {
    case 'breakfast': return '\u2600\uFE0F';
    case 'lunch': return '\uD83C\uDF5D';
    case 'dinner': return '\uD83C\uDF19';
    case 'snack': return '\uD83C\uDF4E';
    default: return '\uD83C\uDF7D\uFE0F';
  }
}

export default function MealsPage() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [calorieSummary, setCalorieSummary] = useState<{ total: number; count: number; mealsCount: number }>({ total: 0, count: 0, mealsCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMeals();
  }, [selectedDate]);

  async function loadMeals() {
    const [list, summary] = await Promise.all([
      getMealsByDate(selectedDate),
      getDailyCalorieSummary(selectedDate),
    ]);
    setMeals(list as unknown as Meal[]);
    setCalorieSummary(summary);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subdir', 'meals');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка загрузки');
        setPhotoPreview('');
        return;
      }

      setPhotoPath(data.path);
    } catch {
      setError('Ошибка загрузки фото');
      setPhotoPreview('');
    } finally {
      setUploading(false);
    }
  }

  function handleCreate() {
    if (!description.trim() && !photoPath) {
      setError('Добавьте описание или фото');
      return;
    }

    setError('');
    startTransition(async () => {
      await createMeal({
        date: selectedDate,
        mealType,
        description: description.trim() || undefined,
        photoPath: photoPath || undefined,
        note: note.trim() || undefined,
        calories: manualCalories ? parseInt(manualCalories, 10) : undefined,
      });

      // Reset form
      setDescription('');
      setNote('');
      setManualCalories('');
      setPhotoPath('');
      setPhotoPreview('');
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMeals();
    });
  }

  function handleDelete(id: number) {
    if (!confirm('Удалить приём пищи?')) return;
    startTransition(async () => {
      const result = await deleteMeal(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 3000);
        return;
      }
      await loadMeals();
    });
  }

  async function handleAnalyze(id: number) {
    setAnalyzingId(id);
    setError('');
    try {
      const result = await analyzeMeal(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 5000);
      }
      await loadMeals();
    } catch {
      setError('Ошибка при анализе');
      setTimeout(() => setError(''), 5000);
    } finally {
      setAnalyzingId(null);
    }
  }

  function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  }

  const isToday = selectedDate === formatDate(new Date());

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Питание</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium"
        >
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-between bg-card rounded-2xl p-3">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 text-text-secondary hover:text-text transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-medium text-text text-center cursor-pointer"
          />
          {isToday && <div className="text-xs text-accent">Сегодня</div>}
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2 text-text-secondary hover:text-text transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Daily calorie summary */}
      {calorieSummary.total > 0 && (
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.51 6.51 0 007.5 10.5a6.5 6.5 0 006.5-6.5c0-.592-.082-1.166-.238-1.714z" />
              </svg>
              <span className="text-sm font-medium">Итого за день</span>
            </div>
            <span className="text-lg font-bold text-accent">{calorieSummary.total} ккал</span>
          </div>
          {calorieSummary.count < calorieSummary.mealsCount && (
            <p className="text-xs text-text-secondary mt-2">
              Калории посчитаны для {calorieSummary.count} из {calorieSummary.mealsCount} приёмов.
              Используйте «Анализ AI» для остальных.
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">Новый приём пищи</h2>

          {/* Meal type */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Тип приёма</label>
            <div className="grid grid-cols-4 gap-2">
              {mealTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setMealType(t.value)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium transition-colors ${
                    mealType === t.value
                      ? 'bg-accent text-white'
                      : 'bg-card-hover text-text-secondary'
                  }`}
                >
                  <div className="text-base mb-0.5">{mealTypeIcon(t.value)}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что ели?"
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none"
            />
          </div>

          {/* Calories */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Калории (ккал)</label>
            <input
              type="number"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
              placeholder="Необязательно — или используйте AI анализ"
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Фото</label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setPhotoPath('');
                    setPhotoPreview('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 bg-card-hover rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-accent transition-colors">
                {uploading ? (
                  <span className="text-sm text-text-secondary">Загрузка...</span>
                ) : (
                  <>
                    <svg className="h-8 w-8 text-text-secondary mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-xs text-text-secondary">Нажмите для загрузки фото</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Заметка</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Дополнительные комментарии..."
              rows={2}
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || uploading}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
          >
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Meals list */}
      {meals.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            Приёмов пищи за этот день нет
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <div key={meal.id} className="bg-card rounded-2xl overflow-hidden">
              {meal.photoPath && (
                <img
                  src={meal.photoPath}
                  alt={meal.description || 'Фото еды'}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{mealTypeIcon(meal.mealType)}</span>
                      <span className="font-medium text-sm">{mealTypeLabel(meal.mealType)}</span>
                      <span className="text-xs text-text-secondary">
                        {new Date(meal.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {meal.description && (
                      <p className="text-sm text-text mt-1">{meal.description}</p>
                    )}
                    {meal.calories && (
                      <span className="inline-block text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-lg mt-1">
                        {meal.calories} ккал
                      </span>
                    )}
                    {meal.note && (
                      <p className="text-xs text-text-secondary mt-1">{meal.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    disabled={isPending}
                    className="text-text-secondary hover:text-danger transition-colors p-2 -mr-2 -mt-1"
                    title="Удалить"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>

                {/* AI Analysis */}
                {meal.aiAnalysis && (
                  <div className="mt-3 bg-accent/10 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                      <span className="text-xs font-medium text-accent">AI анализ</span>
                    </div>
                    {meal.aiAnalysis.split('\n').map((line, i) => (
                      <p key={i} className={`text-sm ${i === 1 ? 'font-medium text-text' : 'text-text-secondary'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {/* Analyze button */}
                {meal.photoPath && (
                  <button
                    onClick={() => handleAnalyze(meal.id)}
                    disabled={analyzingId === meal.id}
                    className="mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-50"
                  >
                    {analyzingId === meal.id
                      ? 'Анализирую...'
                      : meal.aiAnalysis
                        ? 'Повторить анализ AI'
                        : 'Анализ AI'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-text-secondary text-center pt-2">
        {meals.length} {meals.length === 1 ? 'приём' : meals.length < 5 ? 'приёма' : 'приёмов'} пищи
      </div>
    </div>
  );
}
