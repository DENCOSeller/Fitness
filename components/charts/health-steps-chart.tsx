'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface StepsData {
  date: string;
  steps: number | null;
  activeCalories: number | null;
}

export default function HealthStepsChart({ data }: { data: StepsData[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    steps: d.steps,
    calories: d.activeCalories,
  }));

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
          <Bar
            dataKey="steps"
            name="Шаги"
            fill="#0A84FF"
            yAxisId="left"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="calories"
            name="Калории"
            fill="#FF9F0A"
            yAxisId="right"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
