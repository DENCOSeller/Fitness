'use client';

import { useEffect, useState, useTransition } from 'react';
import BodySilhouette from './body-silhouette';
import {
  saveMeasurement,
  getMeasurements,
  deleteMeasurement,
  ALL_ZONES,
  ZONE_LABELS,
  type MeasurementZone,
  type MeasurementRecord,
} from '@/app/(dashboard)/body/measurements-actions';

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
  });
}

// Mini sparkline SVG
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 80, h = 24;
  const min = Math.min(...points) - 0.5;
  const max = Math.max(...points) + 0.5;
  const range = max - min || 1;

  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const color = last < prev ? '#30D158' : last > prev ? '#FF453A' : '#0A84FF';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-6" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MeasurementsPanel() {
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [activeZone, setActiveZone] = useState<MeasurementZone | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const list = await getMeasurements();
    setMeasurements(list as unknown as MeasurementRecord[]);
  }

  // Build zone data for silhouette from latest + previous
  function getZoneData() {
    const latest = measurements[0] ?? null;
    const prev = measurements[1] ?? null;
    const result: Record<string, { value: number | null; delta: number | null }> = {};

    for (const zone of ALL_ZONES) {
      const val = latest?.[zone] ?? null;
      const prevVal = prev?.[zone] ?? null;
      result[zone] = {
        value: val,
        delta: val !== null && prevVal !== null ? +(val - prevVal).toFixed(1) : null,
      };
    }
    return result as Record<MeasurementZone, { value: number | null; delta: number | null }>;
  }

  function handleZoneClick(zone: MeasurementZone) {
    setActiveZone(zone);
    // Pre-fill with today's value if exists
    const todayRecord = measurements.find(m => m.date.startsWith(selectedDate));
    const existing = todayRecord?.[zone];
    setInputValue(existing != null ? String(existing) : '');
    setError('');
  }

  function handleSave() {
    if (!activeZone || !inputValue) return;
    const val = parseFloat(inputValue);
    if (isNaN(val) || val < 10 || val > 300) {
      setError('Введите значение от 10 до 300 см');
      return;
    }

    setError('');
    startTransition(async () => {
      await saveMeasurement({ date: selectedDate, zone: activeZone, value: val });
      setActiveZone(null);
      setInputValue('');
      await loadData();
    });
  }

  function handleDeleteRecord(id: number) {
    if (!confirm('Удалить запись?')) return;
    startTransition(async () => {
      await deleteMeasurement(id);
      await loadData();
    });
  }

  // History sparklines: get last 30 days of data points per zone
  function getSparklineData(zone: MeasurementZone): number[] {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return measurements
      .filter(m => new Date(m.date) >= thirtyDaysAgo && m[zone] !== null)
      .map(m => m[zone] as number)
      .reverse(); // oldest first
  }

  const zoneData = getZoneData();
  const isToday = selectedDate === formatDate(new Date());

  return (
    <div className="space-y-4">
      {/* Silhouette */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4">
        <h2 className="text-sm font-medium text-[#8E8E93] mb-2">Нажмите на точку для замера</h2>
        <BodySilhouette zones={zoneData} activeZone={activeZone} onZoneClick={handleZoneClick} />

        {/* Input for selected zone */}
        {activeZone && (
          <div className="mt-4 bg-[#2C2C2E] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{ZONE_LABELS[activeZone]}</span>
              <button
                onClick={() => { setActiveZone(null); setInputValue(''); }}
                className="text-[#8E8E93] p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white border border-[#38383A] focus:border-[#0A84FF] focus:outline-none"
              />
              {isToday && <span className="text-xs text-[#0A84FF]">Сегодня</span>}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Замер в см"
                  autoFocus
                  className="w-full bg-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white border border-[#38383A] focus:border-[#0A84FF] focus:outline-none pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">см</span>
              </div>
              <button
                onClick={handleSave}
                disabled={isPending || !inputValue}
                className="px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-sm font-medium disabled:opacity-50"
              >
                {isPending ? '...' : 'OK'}
              </button>
            </div>

            {error && <p className="text-xs text-[#FF453A]">{error}</p>}
          </div>
        )}
      </div>

      {/* Zone sparklines grid */}
      {measurements.length > 0 && (
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <h2 className="text-sm font-medium text-[#8E8E93] mb-3">Динамика за 30 дней</h2>
          <div className="grid grid-cols-1 gap-2">
            {ALL_ZONES.map(zone => {
              const points = getSparklineData(zone);
              const latest = zoneData[zone];
              if (points.length === 0) return null;

              return (
                <div
                  key={zone}
                  className="flex items-center justify-between bg-[#2C2C2E] rounded-xl px-3 py-2.5 cursor-pointer active:bg-[#3A3A3C] transition-colors"
                  onClick={() => handleZoneClick(zone)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-20 shrink-0">{ZONE_LABELS[zone]}</span>
                    <Sparkline points={points} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">
                      {latest.value !== null ? `${latest.value} см` : '—'}
                    </span>
                    {latest.delta !== null && latest.delta !== 0 && (
                      <span className={`text-xs font-medium ${latest.delta < 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                        {latest.delta > 0 ? '+' : ''}{latest.delta}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History table */}
      {measurements.length > 0 && (
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <h2 className="text-sm font-medium text-[#8E8E93] mb-3">История замеров</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#8E8E93]">
                  <th className="text-left py-2 pr-2 font-medium sticky left-0 bg-[#1C1C1E]">Дата</th>
                  {ALL_ZONES.map(z => (
                    <th key={z} className="text-center py-2 px-1.5 font-medium whitespace-nowrap">{ZONE_LABELS[z]}</th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => {
                  const prev = measurements[idx + 1] ?? null;
                  return (
                    <tr key={m.id} className="border-t border-[#38383A]/50">
                      <td className="py-2 pr-2 text-sm font-medium sticky left-0 bg-[#1C1C1E] whitespace-nowrap">
                        {formatDisplayDate(m.date)}
                      </td>
                      {ALL_ZONES.map(zone => {
                        const val = m[zone];
                        const prevVal = prev?.[zone] ?? null;
                        const delta = val !== null && prevVal !== null ? +(val - prevVal).toFixed(1) : null;

                        return (
                          <td key={zone} className="text-center py-2 px-1.5">
                            {val !== null ? (
                              <div>
                                <span className="text-sm">{val}</span>
                                {delta !== null && delta !== 0 && (
                                  <span className={`block text-[10px] ${delta < 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                                    {delta > 0 ? '\u2191' : '\u2193'}{Math.abs(delta)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#48484A]">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-1">
                        <button
                          onClick={() => handleDeleteRecord(m.id)}
                          disabled={isPending}
                          className="text-[#8E8E93] hover:text-[#FF453A] transition-colors p-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {measurements.length === 0 && (
        <div className="bg-[#1C1C1E] rounded-2xl p-8 text-center">
          <p className="text-[#8E8E93] text-sm">Замеров пока нет. Нажмите на точку на силуэте.</p>
        </div>
      )}
    </div>
  );
}
