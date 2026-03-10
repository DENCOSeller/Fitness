'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface BodyData {
  date: Date | string;
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  waterPct: number | null;
}

const lines = [
  { key: 'weight', name: 'Вес (кг)', color: '#0A84FF', yAxisId: 'left' },
  { key: 'bodyFatPct', name: 'Жир (%)', color: '#FF9F0A', yAxisId: 'right' },
  { key: 'muscleMass', name: 'Мышцы (%)', color: '#30D158', yAxisId: 'right' },
  { key: 'waterPct', name: 'Вода (%)', color: '#5E5CE6', yAxisId: 'right' },
] as const;

export default function BodyChart({ data }: { data: BodyData[] }) {
  if (data.length === 0) return null;

  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      weight: d.weight,
      bodyFatPct: d.bodyFatPct,
      muscleMass: d.muscleMass,
      waterPct: d.waterPct,
    }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: '1px solid #38383A',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8E8E93' }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              yAxisId={line.yAxisId}
              dot={{ r: 3, fill: line.color }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
