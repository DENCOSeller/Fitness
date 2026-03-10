'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from './actions';

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      {/* User */}
      <Section title="Профиль">
        <Row label="Имя" value="Даниил" />
        <Row label="Аккаунт" value="Единственный пользователь" last />
      </Section>

      {/* Password info */}
      <Section title="Безопасность">
        <div className="px-4 py-3">
          <p className="text-sm text-text-secondary">
            Для смены пароля обнови <code className="bg-card-hover px-1.5 py-0.5 rounded text-xs text-accent">AUTH_PASSWORD</code> в файле <code className="bg-card-hover px-1.5 py-0.5 rounded text-xs text-accent">.env</code> и перезапусти сервер.
          </p>
        </div>
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
