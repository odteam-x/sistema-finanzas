"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { PRIMARY_ROUTES, SECONDARY_GROUPS, type NavRoute } from "./routes";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  // El enlace se declara una vez: entre los primarios y los cuatro grupos, el
  // mismo marcado se pintaría cinco veces.
  const navLink = (r: NavRoute) => {
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
        <Icon name={r.icon} size={20} filled={active} />
        {r.label}
      </Link>
    );
  };

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

      {/* Los mismos grupos que el menú "Más" de móvil: si "Compromisos"
          existiera solo en el teléfono, el usuario aprendería una organización
          que la mitad de la app no respeta.
          `overflow-y-auto` reemplaza al `overflow-hidden`: con 14 enlaces y
          cuatro encabezados la lista no cabe en un portátil de 800px de alto y
          empujaba "Cerrar sesión" fuera de la pantalla. */}
      <nav className="surface-nav border overflow-y-auto rounded-card p-2 flex flex-col gap-0.5 flex-1 min-h-0">
        {/* Los tres primarios van sin encabezado: son los mismos que la tab
            bar de móvil enseña sueltos, no una sección más. */}
        {PRIMARY_ROUTES.map(navLink)}

        {SECONDARY_GROUPS.map((g) => (
          <div key={g.group} className="flex flex-col gap-0.5">
            <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-subtle">
              {g.label}
            </p>
            {g.routes.map(navLink)}
          </div>
        ))}
      </nav>

      <div className="surface-nav border rounded-card p-3">
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
