'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listTemplates, deleteTemplate } from './actions';

interface TemplateExercise {
  id: number;
  sets: number;
  reps: number;
  weight: number;
  exercise: { id: number; name: string; muscleGroup: string };
}

interface Template {
  id: number;
  name: string;
  createdAt: string | Date;
  exercises: TemplateExercise[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    listTemplates().then((data) => {
      setTemplates(data as unknown as Template[]);
      setLoading(false);
    });
  }, []);

  const handleDelete = (id: number) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    startTransition(async () => {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
    });
  };

  const handleUseTemplate = (id: number) => {
    router.push(`/workouts/new?template=${id}`);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Шаблоны</h1>
        <Link
          href="/workouts"
          className="text-accent text-sm"
        >
          Тренировки
        </Link>
      </div>

      {loading && (
        <div className="text-text-secondary text-sm text-center py-8">Загрузка...</div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm mb-2">Пока нет шаблонов</p>
          <p className="text-text-secondary text-xs">
            Сохраните тренировку как шаблон на странице тренировки
          </p>
        </div>
      )}

      {templates.map((t) => (
        <div key={t.id} className="bg-card rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h2 className="text-text font-semibold text-sm">{t.name}</h2>
            <span className="text-text-secondary text-xs">{t.exercises.length} упр.</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {t.exercises.map((te) => (
              <span
                key={te.id}
                className="bg-bg text-text-secondary text-xs px-2 py-0.5 rounded-md"
              >
                {te.exercise.name}
                <span className="text-text-secondary/60 ml-1">
                  {te.sets}×{te.reps}
                  {te.weight > 0 && ` ${te.weight}кг`}
                </span>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleUseTemplate(t.id)}
              className="flex-1 bg-accent text-white text-sm font-medium py-2 rounded-xl hover:bg-accent/90 transition-colors"
            >
              Использовать
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              disabled={isPending}
              className={`text-sm px-3 py-2 rounded-xl transition-colors ${
                confirmDeleteId === t.id
                  ? 'bg-danger text-white'
                  : 'text-danger hover:bg-danger/15'
              }`}
            >
              {confirmDeleteId === t.id ? 'Точно?' : 'Удалить'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
