'use client';

export interface CardioSetData {
  duration: number;
  distance: number;
  speed: number;
  incline: number;
  heartRate: number;
}

interface CardioSetInputProps {
  data: CardioSetData;
  onChange: (data: CardioSetData) => void;
}

export default function CardioSetInput({ data, onChange }: CardioSetInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-text-secondary text-xs w-24">Длительность</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="мин"
          value={data.duration || ''}
          onChange={(e) => onChange({ ...data, duration: parseInt(e.target.value) || 0 })}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
        />
        <span className="text-text-secondary text-xs w-8">мин</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-text-secondary text-xs w-24">Дистанция</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={data.distance || ''}
          onChange={(e) => onChange({ ...data, distance: parseFloat(e.target.value) || 0 })}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
        />
        <span className="text-text-secondary text-xs w-8">км</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-text-secondary text-xs w-24">Скорость</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={data.speed || ''}
          onChange={(e) => onChange({ ...data, speed: parseFloat(e.target.value) || 0 })}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
        />
        <span className="text-text-secondary text-xs w-8">км/ч</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-text-secondary text-xs w-24">Наклон</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={data.incline || ''}
          onChange={(e) => onChange({ ...data, incline: parseFloat(e.target.value) || 0 })}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
        />
        <span className="text-text-secondary text-xs w-8">%</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-text-secondary text-xs w-24">Пульс</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={data.heartRate || ''}
          onChange={(e) => onChange({ ...data, heartRate: parseInt(e.target.value) || 0 })}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
        />
        <span className="text-text-secondary text-xs w-8">уд/м</span>
      </div>
    </div>
  );
}
