'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getBodyMetrics, type MetricPoint } from '@/app/(dashboard)/dashboard-metrics-actions';

type MetricKey = 'weight' | 'bodyFatPct' | 'muscleMass';

const METRICS: { key: MetricKey; label: string; unit: string; color: string; invertDelta: boolean; yAxis: 'left' | 'right' }[] = [
  { key: 'weight', label: 'Вес', unit: 'кг', color: '#0A84FF', invertDelta: true, yAxis: 'left' },
  { key: 'bodyFatPct', label: 'Жир', unit: '%', color: '#FF453A', invertDelta: true, yAxis: 'right' },
  { key: 'muscleMass', label: 'Мышцы', unit: '%', color: '#30D158', invertDelta: false, yAxis: 'right' },
];

const PERIODS = [
  { label: '1Н', days: 7 },
  { label: '1М', days: 30 },
  { label: '3М', days: 90 },
  { label: '6М', days: 180 },
  { label: 'Всё', days: undefined },
] as const;

interface Props {
  initialWeight: number | null;
  initialFat: number | null;
  initialMuscle: number | null;
  weightDelta: number | null;
  fatDelta: number | null;
  muscleDelta: number | null;
}

export default function BodyMetricsWidget({
  initialWeight, initialFat, initialMuscle,
  weightDelta, fatDelta, muscleDelta,
}: Props) {
  // null = show all three lines
  const [soloMetric, setSoloMetric] = useState<MetricKey | null>(null);
  const [periodIdx, setPeriodIdx] = useState(1); // default: 1 month
  const [data, setData] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const period = PERIODS[periodIdx];

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getBodyMetrics(period.days);
    setData(result);
    setLoading(false);
  }, [period.days]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentValues: Record<MetricKey, number | null> = {
    weight: initialWeight,
    bodyFatPct: initialFat,
    muscleMass: initialMuscle,
  };

  // Calculate deltas from period data instead of using static deltas
  const periodDeltas = useMemo(() => {
    const result: Record<MetricKey, number | null> = { weight: null, bodyFatPct: null, muscleMass: null };
    for (const m of METRICS) {
      const points = data.filter(d => d[m.key] != null).map(d => d[m.key] as number);
      if (points.length >= 2) {
        result[m.key] = +(points[points.length - 1] - points[0]).toFixed(1);
      }
    }
    return result;
  }, [data]);

  // Use period deltas if we have data, otherwise fall back to initial deltas
  const deltas: Record<MetricKey, number | null> = {
    weight: periodDeltas.weight ?? weightDelta,
    bodyFatPct: periodDeltas.bodyFatPct ?? fatDelta,
    muscleMass: periodDeltas.muscleMass ?? muscleDelta,
  };

  function handleCardClick(key: MetricKey) {
    setSoloMetric(prev => prev === key ? null : key);
  }

  // Which metrics to show on chart
  const visibleMetrics = soloMetric ? METRICS.filter(m => m.key === soloMetric) : METRICS;

  // Chart data — include all metrics
  const chartData = useMemo(() => {
    return data.map(d => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      weight: d.weight,
      bodyFatPct: d.bodyFatPct,
      muscleMass: d.muscleMass,
    }));
  }, [data]);

  const hasAnyData = chartData.length > 0;
  const hasEnoughData = chartData.length >= 2;

  // Need right axis?
  const showRightAxis = visibleMetrics.some(m => m.yAxis === 'right');
  const showLeftAxis = visibleMetrics.some(m => m.yAxis === 'left');

  return (
    <div className="space-y-3">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        {METRICS.map(m => {
          const isActive = soloMetric === m.key;
          const value = currentValues[m.key];
          const d = deltas[m.key];
          const isPositive = d != null && d > 0;
          const isNegative = d != null && d < 0;
          const isGood = m.invertDelta ? isNegative : isPositive;
          const isBad = m.invertDelta ? isPositive : isNegative;

          return (
            <button
              key={m.key}
              onClick={() => handleCardClick(m.key)}
              className={`rounded-2xl p-3 text-left transition-all ${
                isActive
                  ? 'bg-[#0A84FF]/15 ring-2 ring-[#0A84FF] ring-inset'
                  : 'bg-card hover:bg-card-hover'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                <p className={`text-xs ${isActive ? 'text-[#0A84FF]' : 'text-text-secondary'}`}>{m.label}</p>
              </div>
              <p className="text-xl font-bold">
                {value != null ? value.toFixed(1) : '—'}
                {value != null && <span className="text-xs font-normal text-text-secondary ml-0.5">{m.unit}</span>}
              </p>
              {d != null && d !== 0 && (
                <div className={`flex items-center gap-0.5 mt-1 text-xs font-medium ${isGood ? 'text-[#30D158]' : isBad ? 'text-[#FF453A]' : 'text-text-secondary'}`}>
                  <span>{isPositive ? '↑' : '↓'}</span>
                  <span>{isPositive ? '+' : ''}{d} {m.unit}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart card */}
      <div className="rounded-2xl bg-card p-4">
        {/* Chart */}
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-text-secondary text-sm">Загрузка...</p>
          </div>
        ) : hasEnoughData ? (
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: showRightAxis ? 5 : -10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8E8E93', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#38383A' }}
                />
                {showLeftAxis && (
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#8E8E93', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#38383A' }}
                    domain={['auto', 'auto']}
                  />
                )}
                {showRightAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#8E8E93', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#38383A' }}
                    domain={['auto', 'auto']}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1C1C1E',
                    border: '1px solid #38383A',
                    borderRadius: 8,
                    color: '#FFFFFF',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => {
                    const m = METRICS.find(m => m.key === name);
                    return [`${value} ${m?.unit || ''}`, m?.label || name];
                  }}
                />
                {visibleMetrics.map(m => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.key}
                    yAxisId={soloMetric ? (m.yAxis) : m.yAxis}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: m.color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : hasAnyData ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-[#636366]">Одна точка — нужно больше данных для графика</p>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-text-secondary text-sm">Нет данных за этот период</p>
          </div>
        )}

        {/* Period switcher below chart */}
        <div className="flex bg-[#2C2C2E] rounded-xl p-1 gap-1 mt-3">
          {PERIODS.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(idx)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periodIdx === idx ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
