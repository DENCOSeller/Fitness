'use client';

import { useEffect, useState, useTransition } from 'react';
import { getUserEquipment, toggleEquipment } from '@/app/(dashboard)/settings/equipment-actions';
import { EQUIPMENT_CATALOG } from '@/lib/equipment-catalog';
import type { EquipmentItem } from '@/lib/equipment-catalog';

export default function EquipmentTab() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUserEquipment().then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  const handleToggle = (name: string) => {
    const item = items.find(i => i.name === name);
    if (!item) return;
    const newVal = !item.available;

    // Optimistic update
    setItems(prev => prev.map(i => i.name === name ? { ...i, available: newVal } : i));

    startTransition(async () => {
      await toggleEquipment(name, newVal);
    });
  };

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Загрузка...</div>;
  }

  const availableCount = items.filter(i => i.available).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-text-secondary">
          Отмечено: {availableCount} из {items.length}
        </p>
      </div>

      {EQUIPMENT_CATALOG.map((group) => (
        <div key={group.category}>
          <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 px-1">
            {group.category}
          </h3>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border">
            {group.items.map((name) => {
              const item = items.find(i => i.name === name);
              const available = item?.available ?? false;
              return (
                <button
                  key={name}
                  onClick={() => handleToggle(name)}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors disabled:opacity-70"
                >
                  <span className="text-sm text-text">{name}</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    available
                      ? 'bg-accent border-accent'
                      : 'border-border bg-transparent'
                  }`}>
                    {available && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
