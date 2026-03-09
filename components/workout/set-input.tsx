'use client';

interface SetData {
  reps: number;
  weight: number;
}

interface SetInputProps {
  index: number;
  data: SetData;
  onChange: (data: SetData) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function SetInput({ index, data, onChange, onRemove, canRemove }: SetInputProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary text-xs w-6 text-center">{index + 1}</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Повт."
        value={data.reps || ''}
        onChange={(e) => onChange({ ...data, reps: parseInt(e.target.value) || 0 })}
        className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
      />
      <span className="text-text-secondary text-xs">×</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="Вес"
        value={data.weight || ''}
        onChange={(e) => onChange({ ...data, weight: parseFloat(e.target.value) || 0 })}
        className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text text-center focus:border-accent outline-none"
      />
      <span className="text-text-secondary text-xs">кг</span>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-text-secondary hover:text-danger transition-colors p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
