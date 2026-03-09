import Logo from "@/components/ui/logo";

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 md:hidden">
        <Logo size="large" />
      </div>

      <h1 className="text-2xl font-bold text-text">Главная</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Добро пожаловать в DENCO Health
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-border/80">
          <h2 className="text-sm font-medium text-text-secondary">Чек-ин</h2>
          <p className="mt-1 text-lg font-semibold text-text">Не заполнен</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-border/80">
          <h2 className="text-sm font-medium text-text-secondary">Последняя тренировка</h2>
          <p className="mt-1 text-lg font-semibold text-text">—</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-border/80">
          <h2 className="text-sm font-medium text-text-secondary">Вес</h2>
          <p className="mt-1 text-lg font-semibold text-text">—</p>
        </div>
      </div>
    </div>
  );
}
