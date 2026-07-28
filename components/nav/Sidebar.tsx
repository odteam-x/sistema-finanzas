"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NavIcon } from "./NavIcon";
import { NAV_ROUTES } from "./routes";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-dvh sticky top-0 p-4 gap-4">
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <Image
          src="/icons/icon-192.png"
          alt="Cachin'"
          width={40}
          height={40}
          className="shrink-0"
          priority
        />
        <div className="leading-tight">
          <p className="font-extrabold text-ink">Cachin&apos;</p>
          <p className="text-xs text-muted">Control personal</p>
        </div>
      </div>

      <nav className="surface-nav border overflow-hidden rounded-card p-2 flex flex-col gap-0.5">
        {NAV_ROUTES.map((r) => {
          const active = pathname === r.href;
          return (
            <Link
              key={r.href}
              href={r.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-tile text-[1.05rem] font-semibold transition-colors",
                active
                  ? "bg-gradient-brand text-white"
                  : "text-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <NavIcon name={r.icon} size={20} active={active} />
              {r.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto surface-nav border rounded-card p-3">
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
