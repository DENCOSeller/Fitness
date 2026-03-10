'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from './actions';
import Logo from '@/components/ui/logo';

const STEPS = ['Имя и пол', 'Дата рождения и рост', 'Вес', 'Цель и активность'];

const GOAL_OPTIONS = [
  { value: 'loss', label: 'Похудение', icon: '🔥', desc: 'Снижение веса и жира' },
  { value: 'maintain', label: 'Поддержание', icon: '⚖️', desc: 'Сохранить текущую форму' },
  { value: 'gain', label: 'Набор массы', icon: '💪', desc: 'Рост мышечной массы' },
];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Сидячий', desc: 'Офис, мало движения' },
  { value: 'light', label: 'Лёгкая', desc: '1-2 тренировки в неделю' },
  { value: 'moderate', label: 'Средняя', desc: '3-4 тренировки в неделю' },
  { value: 'active', label: 'Высокая', desc: '5+ тренировок в неделю' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  const canNext = () => {
    switch (step) {
      case 0: return gender !== '';
      case 1: return birthDate !== '' && height !== '';
      case 2: return weight !== '';
      case 3: return goal !== '' && activityLevel !== '';
      default: return false;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    await completeOnboarding({
      name,
      gender,
      birthDate,
      height: parseInt(height, 10),
      weight: parseFloat(weight),
      targetWeight: targetWeight ? parseFloat(targetWeight) : parseFloat(weight),
      activityLevel,
      goal,
    });
    router.push('/');
  };

  const inputClass = "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="large" />
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-card-hover'
              }`}
            />
          ))}
        </div>

        <h2 className="text-lg font-bold mb-1">{STEPS[step]}</h2>
        <p className="text-sm text-text-secondary mb-6">Шаг {step + 1} из {STEPS.length}</p>

        {/* Step 1: Name + Gender */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Имя (необязательно)</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут?" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2">Пол</label>
              <div className="flex gap-3">
                {[{ value: 'male', label: 'Мужчина', emoji: '👨' }, { value: 'female', label: 'Женщина', emoji: '👩' }].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`flex-1 py-4 rounded-2xl text-center transition-all ${
                      gender === g.value
                        ? 'bg-accent/20 border-2 border-accent'
                        : 'bg-card border-2 border-transparent'
                    }`}
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="text-sm font-medium">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Birth date + Height */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Дата рождения</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Рост (см)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 3: Weight */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Текущий вес (кг)</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Целевой вес (кг) — необязательно</label>
              <input type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder={weight || '75'} className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 4: Goal + Activity */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-2">Цель</label>
              <div className="space-y-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      goal === g.value
                        ? 'bg-accent/20 border-2 border-accent'
                        : 'bg-card border-2 border-transparent'
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{g.label}</div>
                      <div className="text-xs text-text-secondary">{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2">Уровень активности</label>
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivityLevel(a.value)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      activityLevel === a.value
                        ? 'bg-accent/20 border-2 border-accent'
                        : 'bg-card border-2 border-transparent'
                    }`}
                  >
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-text-secondary">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-xl text-sm font-medium text-text-secondary bg-card"
            >
              Назад
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40"
            >
              Далее
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canNext() || saving}
              className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Сохранение...' : 'Начать'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
