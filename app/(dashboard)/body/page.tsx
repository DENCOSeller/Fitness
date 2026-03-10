'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { parseScreenshot, saveBodyMetric, getBodyMetrics, deleteBodyMetric, getImageBase64 } from './actions';
import BodyChart from '@/components/charts/body-chart';

type BodyMetric = {
  id: number;
  date: string;
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  bmi: number | null;
  waterPct: number | null;
  leanMass: number | null;
  bmr: number | null;
  metabolicAge: number | null;
  screenshotPath: string | null;
  createdAt: string;
};

type ParsedData = {
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  bmi: number | null;
  waterPct: number | null;
  leanMass: number | null;
  bmr: number | null;
  metabolicAge: number | null;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BodyPage() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotPath, setScreenshotPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    const list = await getBodyMetrics();
    setMetrics(list as unknown as BodyMetric[]);
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setParsedData(null);
    setWarnings([]);

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Upload screenshot
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subdir', 'body');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка загрузки');
        setScreenshotPreview('');
        return;
      }

      setScreenshotPath(data.path);
      setUploading(false);

      // Parse with Claude Vision
      setParsing(true);
      const imageData = await getImageBase64(data.path);
      if (!imageData) {
        setError('Не удалось прочитать загруженное изображение');
        setParsing(false);
        return;
      }

      const result = await parseScreenshot(imageData.base64, imageData.mediaType);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setParsedData(result.data);
        if (result.warnings) {
          setWarnings(result.warnings);
        }
      }
    } catch {
      setError('Ошибка загрузки скриншота');
      setScreenshotPreview('');
    } finally {
      setUploading(false);
      setParsing(false);
    }
  }

  function handleFieldChange(field: keyof ParsedData, value: string) {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      [field]: value === '' ? null : parseFloat(value),
    });
  }

  function handleSave() {
    if (!parsedData) return;

    setError('');
    startTransition(async () => {
      await saveBodyMetric({
        date: selectedDate,
        ...parsedData,
        screenshotPath: screenshotPath || null,
      });

      // Reset
      setParsedData(null);
      setScreenshotPreview('');
      setScreenshotPath('');
      setWarnings([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMetrics();
    });
  }

  function handleDelete(id: number) {
    if (!confirm('Удалить замер?')) return;
    startTransition(async () => {
      const result = await deleteBodyMetric(id);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(''), 3000);
        return;
      }
      await loadMetrics();
    });
  }

  function resetForm() {
    setParsedData(null);
    setScreenshotPreview('');
    setScreenshotPath('');
    setWarnings([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const fields: { key: keyof ParsedData; label: string; unit: string; step: string }[] = [
    { key: 'weight', label: 'Вес', unit: 'кг', step: '0.1' },
    { key: 'bodyFatPct', label: 'Жир', unit: '%', step: '0.1' },
    { key: 'muscleMass', label: 'Мышцы', unit: '%', step: '0.1' },
    { key: 'waterPct', label: 'Вода', unit: '%', step: '0.1' },
    { key: 'leanMass', label: 'Безжир. масса', unit: 'кг', step: '0.1' },
    { key: 'bmr', label: 'СООВ', unit: 'ккал', step: '1' },
    { key: 'bmi', label: 'ИМТ', unit: '', step: '0.1' },
    { key: 'metabolicAge', label: 'Метаб. возраст', unit: 'лет', step: '1' },
  ];

  const historyCards: { key: keyof BodyMetric; label: string; unit: string; format?: (v: number) => string }[] = [
    { key: 'weight', label: 'кг', unit: '' },
    { key: 'bodyFatPct', label: 'жир', unit: '%', format: (v) => `${v}%` },
    { key: 'muscleMass', label: 'мышцы', unit: '%', format: (v) => `${v}%` },
    { key: 'waterPct', label: 'вода', unit: '%', format: (v) => `${v}%` },
    { key: 'leanMass', label: 'безжир.', unit: 'кг' },
    { key: 'bmr', label: 'СООВ', unit: 'ккал' },
    { key: 'bmi', label: 'ИМТ', unit: '' },
    { key: 'metabolicAge', label: 'мет. возраст', unit: '' },
  ];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Тело</h1>

      {/* Upload section */}
      <div className="bg-card rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Загрузить скриншот Picooc</h2>

        {/* Date picker */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Дата замера</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text border border-border focus:border-accent focus:outline-none"
          />
        </div>

        {/* Screenshot upload */}
        {screenshotPreview ? (
          <div className="relative">
            <img
              src={screenshotPreview}
              alt="Скриншот Picooc"
              className="w-full h-64 object-contain rounded-xl bg-black/20"
            />
            <button
              onClick={resetForm}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-40 bg-card-hover rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-accent transition-colors">
            {uploading ? (
              <span className="text-sm text-text-secondary">Загрузка...</span>
            ) : (
              <>
                <svg className="h-10 w-10 text-text-secondary mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm text-text-secondary">Загрузите скриншот из Picooc</span>
                <span className="text-xs text-text-secondary mt-1">Нажмите или перетащите</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
          </label>
        )}

        {/* Parsing indicator */}
        {parsing && (
          <div className="flex items-center gap-3 bg-accent/10 rounded-xl px-4 py-3">
            <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-accent">Claude анализирует скриншот...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger/15 text-danger rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-warning/15 text-warning rounded-xl px-4 py-3 text-sm space-y-1">
            <div className="font-medium">Предупреждения:</div>
            {warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}

        {/* Parsed data for confirmation / manual edit */}
        {parsedData && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-secondary">Распознанные данные</h3>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-text-secondary mb-1">
                    {f.label} {f.unit && `(${f.unit})`}
                  </label>
                  <input
                    type="number"
                    step={f.step}
                    value={parsedData[f.key] ?? ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    placeholder="—"
                    className="w-full bg-card-hover rounded-xl px-3 py-2.5 text-sm text-text border border-border focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
              >
                {isPending ? 'Сохранение...' : 'Подтвердить и сохранить'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-3 rounded-xl bg-card-hover text-text-secondary text-sm font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {metrics.length > 1 && (
        <div className="bg-card rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3">Динамика</h2>
          <BodyChart data={metrics} />
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">История замеров</h2>
        {metrics.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center">
            <p className="text-text-secondary text-sm">Замеров пока нет</p>
          </div>
        ) : (
          metrics.map((m) => (
            <div key={m.id} className="bg-card rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium">{formatDisplayDate(m.date)}</span>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={isPending}
                  className="text-text-secondary hover:text-danger transition-colors p-1 -mr-1 -mt-1"
                  title="Удалить"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {historyCards.map((card) => {
                  const val = m[card.key] as number | null;
                  if (val === null) return null;
                  return (
                    <div key={card.key} className="bg-card-hover rounded-xl py-2 px-1">
                      <div className="text-lg font-bold text-text">
                        {card.format ? card.format(val) : val}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {card.label} {card.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-text-secondary text-center pt-2">
        {metrics.length} {metrics.length === 1 ? 'замер' : metrics.length < 5 ? 'замера' : 'замеров'}
      </div>
    </div>
  );
}
