'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface HrData {
  date: string;
  restingHr: number | null;
}

export default function HealthHrChart({ data }: { data: HrData[] }) {
  if (data.length === 0) return null;

  const chartData = data
    .filter((d) => d.restingHr != null)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      hr: d.restingHr,
    }));

  if (chartData.length === 0) return null;

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
            domain={['dataMin - 5', 'dataMax + 5']}
            tick={{ fill: '#8E8E93', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#38383A' }}
            unit=" уд"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: '1px solid #38383A',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 13,
            }}
            formatter={(value) => [`${value} уд/мин`, 'Пульс покоя']}
          />
          <Line
            type="monotone"
            dataKey="hr"
            name="Пульс покоя"
            stroke="#FF453A"
            strokeWidth={2}
            dot={{ r: 3, fill: '#FF453A' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
