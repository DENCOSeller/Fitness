"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./logo";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/checkin", label: "Чек-ин" },
  { href: "/workouts", label: "Тренировки" },
  { href: "/exercises", label: "Упражнения" },
  { href: "/meals", label: "Питание" },
  { href: "/body", label: "Тело" },
  { href: "/progress", label: "Фото прогресса" },
  { href: "/health", label: "Apple Health" },
  { href: "/ai", label: "AI-советы" },
  { href: "/settings", label: "Настройки" },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-card-hover hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
