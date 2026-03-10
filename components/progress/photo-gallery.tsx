'use client';

type ProgressPhoto = {
  id: number;
  date: string;
  photoPath: string;
  aiAnalysis: string | null;
  createdAt: string;
};

interface PhotoGalleryProps {
  photos: ProgressPhoto[];
  analyzingId: number | null;
  isPending: boolean;
  onAnalyze: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PhotoGallery({
  photos,
  analyzingId,
  isPending,
  onAnalyze,
  onDelete,
}: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center">
        <p className="text-text-secondary text-sm">
          Фото прогресса пока нет. Загрузите первое фото!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Галерея</h2>
      {photos.map((photo) => (
        <div key={photo.id} className="bg-card rounded-2xl overflow-hidden">
          <img
            src={photo.photoPath}
            alt={`Прогресс ${formatDateLabel(photo.date)}`}
            className="w-full h-80 object-cover"
          />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{formatDateLabel(photo.date)}</p>
              </div>
              <button
                onClick={() => onDelete(photo.id)}
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
            {photo.aiAnalysis && (
              <div className="mt-3 bg-accent/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  <span className="text-xs font-medium text-accent">AI анализ</span>
                </div>
                <div className="text-sm text-text-secondary whitespace-pre-line">
                  {photo.aiAnalysis}
                </div>
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={() => onAnalyze(photo.id)}
              disabled={analyzingId === photo.id}
              className="mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-50"
            >
              {analyzingId === photo.id
                ? 'Анализирую...'
                : photo.aiAnalysis
                  ? 'Повторить анализ AI'
                  : 'Анализ AI'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
