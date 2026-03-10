'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import {
  uploadProgressPhoto,
  getProgressPhotos,
  deleteProgressPhoto,
  analyzeProgressPhoto,
  compareProgressPhotos,
} from './actions';
import PhotoGallery from '@/components/progress/photo-gallery';
import PhotoCompare from '@/components/progress/photo-compare';

type ProgressPhoto = {
  id: number;
  date: string;
  photoPath: string;
  aiAnalysis: string | null;
  createdAt: string;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ProgressPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDate, setUploadDate] = useState(formatDate(new Date()));
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparison, setComparison] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    const list = await getProgressPhotos();
    setPhotos(list as unknown as ProgressPhoto[]);
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
      formData.append('subdir', 'progress');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка загрузки');
        setPhotoPreview('');
        return;
      }

      // Save to DB
      await uploadProgressPhoto({
        date: uploadDate,
        photoPath: data.path,
      });

      setPhotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadPhotos();
    } catch {
      setError('Ошибка загрузки фото');
      setPhotoPreview('');
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: number) {
    if (!confirm('Удалить фото прогресса?')) return;
    startTransition(async () => {
      const result = await deleteProgressPhoto(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 3000);
        return;
      }
      await loadPhotos();
    });
  }

  async function handleAnalyze(id: number) {
    setAnalyzingId(id);
    setError('');
    try {
      const result = await analyzeProgressPhoto(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 5000);
      }
      await loadPhotos();
    } catch {
      setError('Ошибка при анализе');
      setTimeout(() => setError(''), 5000);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleCompare(id1: number, id2: number) {
    setComparing(true);
    setComparison(null);
    setError('');
    try {
      const result = await compareProgressPhotos(id1, id2);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 5000);
      } else {
        setComparison(result.comparison || null);
      }
    } catch {
      setError('Ошибка при сравнении');
      setTimeout(() => setError(''), 5000);
    } finally {
      setComparing(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Фото прогресса</h1>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            compareMode
              ? 'bg-accent text-white'
              : 'bg-card-hover text-text-secondary'
          }`}
        >
          {compareMode ? 'Отмена' : 'Сравнить'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Upload section */}
      {!compareMode && (
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">Загрузить фото</h2>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Дата</label>
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text border border-border focus:border-accent focus:outline-none"
            />
          </div>

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Загрузка...</span>
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 bg-card-hover rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-accent transition-colors">
              {uploading ? (
                <span className="text-sm text-text-secondary">Загрузка...</span>
              ) : (
                <>
                  <svg className="h-10 w-10 text-text-secondary mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span className="text-sm text-text-secondary">Сделать фото или выбрать файл</span>
                  <span className="text-xs text-text-secondary mt-1">Одно фото в день</span>
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
      )}

      {/* Compare mode */}
      {compareMode && photos.length >= 2 && (
        <PhotoCompare
          photos={photos}
          onCompare={handleCompare}
          comparing={comparing}
          comparison={comparison}
        />
      )}

      {compareMode && photos.length < 2 && (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            Для сравнения нужно минимум 2 фото
          </p>
        </div>
      )}

      {/* Gallery */}
      {!compareMode && (
        <PhotoGallery
          photos={photos}
          analyzingId={analyzingId}
          isPending={isPending}
          onAnalyze={handleAnalyze}
          onDelete={handleDelete}
        />
      )}

      <div className="text-xs text-text-secondary text-center pt-2">
        {photos.length} {photos.length === 1 ? 'фото' : photos.length < 5 ? 'фото' : 'фото'} прогресса
      </div>
    </div>
  );
}
