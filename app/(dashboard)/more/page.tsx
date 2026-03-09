import Link from "next/link";

const links = [
  { href: "/exercises", label: "Упражнения", desc: "Библиотека упражнений" },
  { href: "/body", label: "Тело", desc: "Вес, жир, мышцы (Picooc)" },
  { href: "/health", label: "Apple Health", desc: "Шаги, сон, пульс" },
  { href: "/ai", label: "AI-советы", desc: "Рекомендации и отчёты" },
  { href: "/settings", label: "Настройки", desc: "Экспорт и бэкап" },
];

export default function MorePage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text">Ещё</h1>
      <div className="mt-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:bg-card-hover"
          >
            <span className="text-base font-medium text-text">{link.label}</span>
            <span className="mt-0.5 block text-sm text-text-secondary">{link.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
