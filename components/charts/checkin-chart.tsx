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

interface CheckInData {
  date: Date | string;
  wellbeing: number;
  sleep: number;
  stress: number;
  energy: number;
}

const lines = [
  { key: 'wellbeing', name: 'Самочувствие', color: '#0A84FF' },
  { key: 'sleep', name: 'Сон', color: '#5E5CE6' },
  { key: 'stress', name: 'Стресс', color: '#FF453A' },
  { key: 'energy', name: 'Энергия', color: '#30D158' },
] as const;

export default function CheckInChart({ data }: { data: CheckInData[] }) {
  if (data.length === 0) return null;

  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      wellbeing: d.wellbeing,
      sleep: d.sleep,
      stress: d.stress,
      energy: d.energy,
    }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            domain={[1, 10]}
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
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8E8E93' }}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 3, fill: line.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
