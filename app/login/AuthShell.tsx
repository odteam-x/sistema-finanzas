import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** Marco común de las pantallas de autenticación: logo, título, tarjeta y los
 *  enlaces de abajo. Las cuatro se veían iguales; tenerlo una vez evita que
 *  "Entrar" y "Crear cuenta" se separen visualmente con el tiempo. */
export function AuthShell({
  title,
  subtitle,
  children,
  links,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Image
            src="/icons/icon-192.png"
            alt="Cachin'"
            width={100}
            height={100}
            className="mb-2 drop-shadow-sm"
            priority
          />
          <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
          <p className="text-sm text-muted mt-1">{subtitle}</p>
        </div>

        <Card raised className="p-6">
          {children}
        </Card>

        {links && links.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-semibold text-primary-fg">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
