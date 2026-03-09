'use client';

import { useState } from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const colorByValue = (value: number): string => {
  if (value <= 3) return 'bg-danger';
  if (value <= 5) return 'bg-yellow-500';
  if (value <= 7) return 'bg-accent';
  return 'bg-success';
};

export default function Slider({ label, value, onChange, min = 1, max = 10 }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-lg font-semibold tabular-nums w-8 text-right">{value}</span>
      </div>
      <div className="relative">
        <div className="h-2 bg-card-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colorByValue(value)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
