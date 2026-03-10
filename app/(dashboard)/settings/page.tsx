'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout, changePassword } from './actions';
import { getCurrentUser } from './user-action';

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ error?: string; success?: boolean } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      {/* User */}
      <Section title="Профиль">
        <Row label="Email" value={user?.email || '...'} />
        <Row label="Имя" value={user?.name || '—'} last />
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
