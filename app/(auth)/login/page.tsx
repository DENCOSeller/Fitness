"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import Logo from "@/components/ui/logo";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>
        <form action={formAction} className="space-y-4">
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
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder-text-secondary shadow-none transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
            {isPending ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
