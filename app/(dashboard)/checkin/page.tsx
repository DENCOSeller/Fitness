'use client';

import { useEffect, useState, useTransition } from 'react';
import Slider from '@/components/ui/slider';
import CheckInChart from '@/components/charts/checkin-chart';
import { upsertCheckIn, getTodayCheckIn, getCheckIns } from './actions';

type CheckIn = {
  id: number;
  date: Date | string;
  wellbeing: number;
  sleep: number;
  stress: number;
  energy: number;
  note: string | null;
};

const periodOptions = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

export default function CheckInPage() {
  const [wellbeing, setWellbeing] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<CheckIn[]>([]);
  const [period, setPeriod] = useState(30);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadTodayAndHistory();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [period]);

  async function loadTodayAndHistory() {
    const [today, list] = await Promise.all([
      getTodayCheckIn(),
      getCheckIns(period),
    ]);
    if (today) {
      setWellbeing(today.wellbeing);
      setSleep(today.sleep);
      setStress(today.stress);
      setEnergy(today.energy);
      setNote(today.note || '');
      setSaved(true);
    }
    setHistory(list);
  }

  async function loadHistory() {
    const list = await getCheckIns(period);
    setHistory(list);
  }

  function handleSubmit() {
    startTransition(async () => {
      await upsertCheckIn({ wellbeing, sleep, stress, energy, note });
      setSaved(true);
      setIsEditing(false);
      await loadHistory();
    });
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Чек-ин</h1>

      {/* Form */}
      <div className="bg-card rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-semibold">
          {saved && !isEditing ? 'Сегодняшний чек-ин' : 'Как дела сегодня?'}
        </h2>

        <div className={saved && !isEditing ? 'opacity-60 pointer-events-none' : ''}>
          <div className="space-y-4">
            <Slider label="Самочувствие" value={wellbeing} onChange={setWellbeing} />
            <Slider label="Сон" value={sleep} onChange={setSleep} />
            <Slider label="Стресс" value={stress} onChange={setStress} />
            <Slider label="Энергия" value={energy} onChange={setEnergy} />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Заметка (необязательно)"
            rows={3}
            className="mt-4 w-full bg-card-hover rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-secondary border border-border focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {saved && !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-3 rounded-xl bg-card-hover text-accent font-medium text-sm"
          >
            Редактировать
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
          >
            {isPending ? 'Сохранение...' : saved ? 'Обновить' : 'Сохранить'}
          </button>
        )}
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Тренды</h2>
            <div className="flex gap-1">
              {periodOptions.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setPeriod(opt.days)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    period === opt.days
                      ? 'bg-accent text-white'
                      : 'bg-card-hover text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <CheckInChart data={history} />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">История</h2>
          {history.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">
                  {new Date(item.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    weekday: 'short',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="text-text-secondary">Самочув.</div>
                  <div className="text-lg font-semibold">{item.wellbeing}</div>
                </div>
                <div>
                  <div className="text-text-secondary">Сон</div>
                  <div className="text-lg font-semibold">{item.sleep}</div>
                </div>
                <div>
                  <div className="text-text-secondary">Стресс</div>
                  <div className="text-lg font-semibold">{item.stress}</div>
                </div>
                <div>
                  <div className="text-text-secondary">Энергия</div>
                  <div className="text-lg font-semibold">{item.energy}</div>
                </div>
              </div>
              {item.note && (
                <p className="mt-2 text-sm text-text-secondary">{item.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
