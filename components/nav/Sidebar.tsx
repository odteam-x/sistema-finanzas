"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { NAV_ROUTES } from "./routes";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-dvh sticky top-0 p-4 gap-4">
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <span className="grid place-items-center size-10 rounded-2xl bg-primary text-white">
          <Icon name="wallet" size={22} />
        </span>
        <div className="leading-tight">
          <p className="font-extrabold text-ink">Bolsillo Seguro</p>
          <p className="text-xs text-muted">Control personal</p>
        </div>
      </div>

      <nav className="glass rounded-[var(--radius-glass)] p-2 flex flex-col gap-0.5">
        {NAV_ROUTES.map((r) => {
          const active = pathname === r.href;
          return (
            <Link
              key={r.href}
              href={r.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[0.95rem] font-semibold transition-colors",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink/80 hover:bg-black/5",
              )}
            >
              <Icon name={r.icon} size={20} />
              {r.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto glass rounded-[var(--radius-glass)] p-3">
        {email && (
          <p className="text-xs text-muted px-1 mb-2 truncate" title={email}>
            {email}
          </p>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
