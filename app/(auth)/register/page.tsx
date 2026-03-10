"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";
import Logo from "@/components/ui/logo";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold text-text">
          Регистрация
        </h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-secondary"
            >
              Имя (необязательно)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="mt-1 block w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder-text-secondary shadow-none transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Как вас зовут?"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-secondary"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder-text-secondary shadow-none transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={4}
              className="mt-1 block w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder-text-secondary shadow-none transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Минимум 4 символа"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-40"
          >
            {isPending ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-secondary">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
