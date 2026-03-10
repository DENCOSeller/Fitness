'use client';

import { useState } from 'react';

type ProgressPhoto = {
  id: number;
  date: string;
  photoPath: string;
  aiAnalysis: string | null;
  createdAt: string;
};

interface PhotoCompareProps {
  photos: ProgressPhoto[];
  onCompare: (id1: number, id2: number) => void;
  comparing: boolean;
  comparison: string | null;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PhotoCompare({
  photos,
  onCompare,
  comparing,
  comparison,
}: PhotoCompareProps) {
  const [selectedBefore, setSelectedBefore] = useState<number>(
    photos.length > 1 ? photos[photos.length - 1].id : photos[0]?.id ?? 0
  );
  const [selectedAfter, setSelectedAfter] = useState<number>(
    photos[0]?.id ?? 0
  );

  const beforePhoto = photos.find((p) => p.id === selectedBefore);
  const afterPhoto = photos.find((p) => p.id === selectedAfter);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">Сравнение: было / стало</h2>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Было</label>
            <select
              value={selectedBefore}
              onChange={(e) => setSelectedBefore(Number(e.target.value))}
              className="w-full bg-card-hover rounded-xl px-3 py-2.5 text-sm text-text border border-border focus:border-accent focus:outline-none"
            >
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDateLabel(p.date)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Стало</label>
            <select
              value={selectedAfter}
              onChange={(e) => setSelectedAfter(Number(e.target.value))}
              className="w-full bg-card-hover rounded-xl px-3 py-2.5 text-sm text-text border border-border focus:border-accent focus:outline-none"
            >
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDateLabel(p.date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo comparison */}
        <div className="grid grid-cols-2 gap-2">
          {beforePhoto && (
            <div>
              <img
                src={beforePhoto.photoPath}
                alt={`Было: ${formatDateLabel(beforePhoto.date)}`}
                className="w-full h-56 object-cover rounded-xl"
              />
              <p className="text-xs text-text-secondary text-center mt-1">
                {formatDateLabel(beforePhoto.date)}
              </p>
            </div>
          )}
          {afterPhoto && (
            <div>
              <img
                src={afterPhoto.photoPath}
                alt={`Стало: ${formatDateLabel(afterPhoto.date)}`}
                className="w-full h-56 object-cover rounded-xl"
              />
              <p className="text-xs text-text-secondary text-center mt-1">
                {formatDateLabel(afterPhoto.date)}
              </p>
            </div>
          )}
        </div>

        {/* Compare button */}
        {selectedBefore !== selectedAfter && (
          <button
            onClick={() => onCompare(selectedBefore, selectedAfter)}
            disabled={comparing}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
          >
            {comparing ? 'Сравниваю...' : 'AI сравнение'}
          </button>
        )}

        {selectedBefore === selectedAfter && (
          <p className="text-xs text-text-secondary text-center">
            Выберите разные даты для сравнения
          </p>
        )}
      </div>

      {/* Comparison result */}
      {comparison && (
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="text-sm font-medium text-accent">AI сравнение</span>
          </div>
          <div className="text-sm text-text-secondary whitespace-pre-line">
            {comparison}
          </div>
        </div>
      )}
    </div>
  );
}
