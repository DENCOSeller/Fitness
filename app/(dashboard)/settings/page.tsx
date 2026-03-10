'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout, changePassword } from './actions';
import { getCurrentUser, updateProfile } from './user-action';

const GOAL_OPTIONS = [
  { value: 'loss', label: 'Похудение' },
  { value: 'gain', label: 'Набор массы' },
  { value: 'maintain', label: 'Поддержание формы' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    name: string | null;
    age: number | null;
    height: number | null;
    goal: string | null;
    targetWeight: number | null;
  } | null>(null);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileHeight, setProfileHeight] = useState('');
  const [profileGoal, setProfileGoal] = useState('');
  const [profileTargetWeight, setProfileTargetWeight] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ error?: string; success?: boolean } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) {
        setUser(u);
        setProfileName(u.name || '');
        setProfileAge(u.age ? String(u.age) : '');
        setProfileHeight(u.height ? String(u.height) : '');
        setProfileGoal(u.goal || '');
        setProfileTargetWeight(u.targetWeight ? String(u.targetWeight) : '');
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    const age = profileAge ? parseInt(profileAge, 10) : null;
    const height = profileHeight ? parseInt(profileHeight, 10) : null;
    const targetWeight = profileTargetWeight ? parseFloat(profileTargetWeight) : null;
    await updateProfile({
      name: profileName,
      age: age && age > 0 && age < 150 ? age : null,
      height: height && height > 50 && height < 300 ? height : null,
      goal: profileGoal || null,
      targetWeight: targetWeight && targetWeight > 20 && targetWeight < 300 ? targetWeight : null,
    });
    setUser((prev) => prev ? {
      ...prev,
      name: profileName || null,
      age: age && age > 0 && age < 150 ? age : null,
      height: height && height > 50 && height < 300 ? height : null,
      goal: profileGoal || null,
      targetWeight: targetWeight && targetWeight > 20 && targetWeight < 300 ? targetWeight : null,
    } : prev);
    setSavingProfile(false);
    setEditingProfile(false);
    setProfileMsg('Профиль сохранён');
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordMsg(null);
    const result = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (result.success) {
      setPasswordMsg({ success: true });
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
    } else {
      setPasswordMsg({ error: result.error });
    }
  };

  const goalLabel = GOAL_OPTIONS.find((g) => g.value === user?.goal)?.label || '—';

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      {/* Profile */}
      <Section title="Профиль">
        {editingProfile ? (
          <div className="p-4 space-y-3">
            <FieldInput label="Имя" value={profileName} onChange={setProfileName} placeholder="Как вас зовут?" />
            <FieldInput label="Возраст" value={profileAge} onChange={setProfileAge} placeholder="Лет" type="number" />
            <FieldInput label="Рост (см)" value={profileHeight} onChange={setProfileHeight} placeholder="См" type="number" />
            <div>
              <label className="block text-xs text-text-secondary mb-1">Цель</label>
              <select
                value={profileGoal}
                onChange={(e) => setProfileGoal(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Не выбрана</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <FieldInput label="Целевой вес (кг)" value={profileTargetWeight} onChange={setProfileTargetWeight} placeholder="Кг" type="number" />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingProfile ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="rounded-xl px-4 py-2.5 text-sm text-text-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <Row label="Email" value={user?.email || '...'} />
            <Row label="Имя" value={user?.name || '—'} />
            <Row label="Возраст" value={user?.age ? `${user.age} лет` : '—'} />
            <Row label="Рост" value={user?.height ? `${user.height} см` : '—'} />
            <Row label="Цель" value={goalLabel} />
            <Row label="Целевой вес" value={user?.targetWeight ? `${user.targetWeight} кг` : '—'} />
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={() => setEditingProfile(true)}
                className="text-sm text-accent font-medium"
              >
                Редактировать профиль
              </button>
              {profileMsg && (
                <span className="text-sm text-success ml-3">{profileMsg}</span>
              )}
            </div>
          </>
        )}
      </Section>

      {/* Security */}
      <Section title="Безопасность">
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="p-4 space-y-3">
            <input
              type="password"
              placeholder="Текущий пароль"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="password"
              placeholder="Новый пароль (мин. 4 символа)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {passwordMsg?.error && (
              <p className="text-sm text-danger">{passwordMsg.error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {changingPassword ? 'Сохранение...' : 'Сменить пароль'}
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordForm(false); setPasswordMsg(null); }}
                className="rounded-xl px-4 py-2.5 text-sm text-text-secondary"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="px-4 py-3">
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-sm text-accent font-medium"
            >
              Сменить пароль
            </button>
            {passwordMsg?.success && (
              <p className="text-sm text-success mt-1">Пароль успешно изменён</p>
            )}
          </div>
        )}
        <div className="border-t border-border">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-4 py-3 text-left text-danger text-sm font-medium disabled:opacity-50"
          >
            {loggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </button>
        </div>
      </Section>

      {/* App Info */}
      <Section title="О приложении">
        <Row label="Приложение" value="DENCO Health" />
        <Row label="Версия" value="0.1.0" />
        <Row label="Стек" value="Next.js + Prisma + PostgreSQL" />
        <Row label="AI" value="Claude API (Anthropic)" />
        <Row label="Сервер" value="Beget VPS / PM2 + Nginx" last />
      </Section>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 px-1">{title}</h2>
      <div className="rounded-2xl bg-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${!last ? 'border-b border-border' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm text-text-secondary">{value}</span>
    </div>
  );
}
