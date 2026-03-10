'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface SleepData {
  date: string;
  sleepHours: number | null;
}

export default function HealthSleepChart({ data }: { data: SleepData[] }) {
  if (data.length === 0) return null;

  const chartData = data
    .filter((d) => d.sleepHours != null)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      sleep: d.sleepHours,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            domain={[0, 12]}
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
            unit="ч"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: '1px solid #38383A',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 13,
            }}
            formatter={(value) => [`${value} ч`, 'Сон']}
          />
          <ReferenceLine y={8} stroke="#30D158" strokeDasharray="3 3" label={{ value: '8ч', fill: '#30D158', fontSize: 11 }} />
          <Bar
            dataKey="sleep"
            name="Сон"
            fill="#5E5CE6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
