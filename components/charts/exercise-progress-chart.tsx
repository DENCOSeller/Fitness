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
  Bar,
  ComposedChart,
} from 'recharts';

interface ProgressData {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

export default function ExerciseProgressChart({ data }: { data: ProgressData[] }) {
  if (data.length === 0) return null;

  // Reverse so chart goes from oldest to newest
  const chartData = [...data].reverse();

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
            hide
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: '1px solid #38383A',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 13,
            }}
            formatter={(value, name) => {
              if (name === 'Макс. вес') return [`${value} кг`, name];
              return [String(value), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8E8E93' }} />
          <Bar
            yAxisId="volume"
            dataKey="totalVolume"
            name="Объём"
            fill="#0A84FF"
            opacity={0.3}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="maxWeight"
            name="Макс. вес"
            stroke="#FF9F0A"
            strokeWidth={2}
            dot={{ r: 4, fill: '#FF9F0A' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
