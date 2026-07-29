"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { MoneyValue } from "./MoneyValue";
import { Money } from "./Money";
import { Icon, type IconName } from "./Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import { QuickForms, type QuickForm } from "@/components/quick/QuickForms";
import { readPrimaryAccount, writePrimaryAccount } from "@/lib/preferences";
import { readProfile } from "@/lib/profile";
import { hourInDR } from "@/lib/time";
import { formatMoneyIn, toDOP } from "@/lib/currency";
import { cn } from "@/lib/cn";
import type { Currency, SavingsAccount } from "@/lib/types";

export interface AccountBalance {
  id: string;
  name: string;
  type: SavingsAccount["type"];
  balance: number;
  isSavings: boolean;
  currency: Currency;
}

interface HomeHeroProps {
  accounts: AccountBalance[];
  /** Tasas de cambio a RD$ (DOP = 1) — de lib/summary.ts, para convertir
   *  cuentas en moneda extranjera al totalizar (ver lib/currency.ts). */
  rates: Record<Currency, number>;
  /** Nombre desde la BD (fuente de verdad, sin parpadeo en SSR). Si no llega,
   *  se usa el espejo en localStorage como respaldo. */
  displayName?: string;
  periodLabel: string;
  alertCount: number;
}

function timeGreeting(): string {
  // Hora de RD, no la del dispositivo (que puede estar mal configurado).
  const h = hourInDR();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function subscribeNoop() {
  return () => {};
}

/** Bloque superior del Inicio: identidad, saldo y acciones — en ese orden.
 *
 *  Sustituye a GreetingHero + BalanceHero, que eran dos bloques con DOS
 *  cifras grandes compitiendo ("Balance actual" de una cuenta a 56px y
 *  "Balance total" a 35px, más grande que cualquier otra cosa de la
 *  pantalla). Ahora manda el total; la cuenta seleccionada baja a una línea
 *  de apoyo de 14px. El desglose cuenta por cuenta ya no vive aquí: lo tiene
 *  entero /balance, y aquí se recorre tocando los chips. */
export function HomeHero({
  accounts,
  rates,
  displayName,
  periodLabel,
  alertCount,
}: HomeHeroProps) {
  const greeting = useSyncExternalStore(subscribeNoop, timeGreeting, () => "Hola");
  // Init perezoso (seguro: en el servidor no hay localStorage y readProfile
  // devuelve el default; el nombre no depende de la hora, así que no hay
  // riesgo de mismatch de hidratación).
  const [localName] = useState<string>(() => readProfile().displayName);
  const name = displayName || localName;

  const [selectedId, setSelectedId] = useState<string>(() => {
    const saved = readPrimaryAccount();
    if (saved && accounts.some((a) => a.id === saved)) return saved;
    return accounts.find((a) => a.type === "efectivo")?.id ?? accounts[0]?.id ?? "";
  });
  const [activeForm, setActiveForm] = useState<QuickForm>(null);

  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];
  // El total es un monto ÚNICO en RD$: cada cuenta se convierte según su
  // propia moneda antes de sumar.
  const total = accounts.reduce((s, a) => s + toDOP(a.balance, a.currency, rates), 0);
  const savingsPart = accounts
    .filter((a) => a.isSavings)
    .reduce((s, a) => s + toDOP(a.balance, a.currency, rates), 0);

  function pick(id: string) {
    setSelectedId(id);
    writePrimaryAccount(id);
  }

  const hasAccounts = accounts.length > 0;

  return (
    <>
      {/* Alturas recortadas respecto a la primera versión: ocupaba casi media
          pantalla y empujaba las alertas y el resumen fuera del primer
          viewport. El saludo, en cambio, SUBE de tamaño: era lo más pequeño
          del bloque siendo la identidad de quien usa la app. */}
      <header
        className="-mx-4 sm:-mx-6 mb-5 bg-gradient-brand rounded-b-hero px-4 sm:px-6 pb-5 shadow-hero"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {/* 1. Identidad */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/icons/logo-mark-white.png"
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-pill bg-on-brand-well p-2"
              priority
            />
            <div className="min-w-0">
              <p className="text-sm text-on-brand-muted truncate leading-tight">{greeting}</p>
              <h1 className="text-xl font-extrabold text-on-brand truncate leading-tight">
                {name || "Bienvenido"}
              </h1>
            </div>
          </div>
          <Link
            href="/sugerencias"
            aria-label={
              alertCount > 0
                ? `Avisos: ${alertCount} ${alertCount === 1 ? "pendiente" : "pendientes"}`
                : "Avisos"
            }
            className="relative grid place-items-center size-11 shrink-0 rounded-pill bg-on-brand-well text-on-brand active:scale-95 transition-transform"
          >
            <Icon name="bell" size={20} />
            {alertCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-2.5 rounded-pill bg-warning ring-2 ring-[var(--brand-grad-from)]"
              />
            )}
          </Link>
        </div>

        {/* 2. Saldo y cuenta, en UNA fila. Antes el saldo ocupaba solo la
            mitad izquierda —con la derecha vacía— y los chips de cuenta
            colgaban en una fila propia debajo, así que el bloque crecía a lo
            alto mientras desperdiciaba lo ancho. Ahora el selector de cuenta
            vive en ese hueco y el hero pierde una fila entera. */}
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-brand-muted">Balance total</p>
            <MoneyValue
              value={total}
              decimals={false}
              className="block money-lg font-extrabold text-on-brand tabular mt-0.5"
            />
            <p className="mt-1 text-xs text-on-brand-muted">
              Quincena {periodLabel}
              {savingsPart !== 0 && (
                <>
                  {" · "}
                  <Money value={savingsPart} decimals={false} /> en ahorros
                </>
              )}
            </p>
          </div>

          {/* 3. Cuenta a mano — apoyo, no protagonista. Un menú en vez de una
              fila de chips con scroll: ocupa lo mismo con una cuenta que con
              diez, y el saldo de la elegida se lee sin abrirlo. */}
          {hasAccounts ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Cuenta mostrada: ${selected?.name}. Cambiar`}
                className="shrink-0 max-w-[46%] inline-flex items-center gap-1.5 rounded-pill border border-[var(--color-on-brand-well)] px-3.5 min-h-11 text-xs font-semibold text-on-brand-muted cursor-pointer active:scale-95 transition-transform"
              >
                <span className="min-w-0 flex flex-col items-start leading-tight">
                  <span className="truncate max-w-full">
                    {selected?.name}
                  </span>
                  <span className="font-bold tabular text-on-brand">
                    {selected && selected.currency !== "DOP" ? (
                      formatMoneyIn(selected.balance, selected.currency, false)
                    ) : (
                      <Money value={selected?.balance ?? 0} decimals={false} />
                    )}
                  </span>
                </span>
                {accounts.length > 1 && (
                  <Icon name="chevronDown" size={14} className="shrink-0" />
                )}
              </DropdownMenuTrigger>
              {accounts.length > 1 && (
                <DropdownMenuContent align="end">
                  {accounts.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onSelect={() => pick(a.id)}
                      className={cn(
                        "justify-between gap-4",
                        a.id === selected?.id && "font-bold text-primary-fg",
                      )}
                    >
                      <span className="truncate">{a.name}</span>
                      <span className="tabular shrink-0">
                        {a.currency !== "DOP" ? (
                          formatMoneyIn(a.balance, a.currency, false)
                        ) : (
                          <Money value={a.balance} decimals={false} />
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ) : (
            <Link
              href="/balance"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-pill bg-on-brand-well px-4 min-h-11 text-xs font-semibold text-on-brand"
            >
              <Icon name="plus" size={16} />
              Crear cuenta
            </Link>
          )}
        </div>

        {/* 4. Acciones. Suben al primer viewport: antes registrar un gasto
            —lo más frecuente de la app— solo se podía desde el FAB. */}
        <div className="mt-4 grid grid-cols-4 gap-1">
          <QuickAction
            icon="arrowUpRight"
            label="Gasto"
            onClick={() => setActiveForm("gasto")}
          />
          <QuickAction
            icon="arrowDownLeft"
            label="Ingreso"
            onClick={() => setActiveForm("ingreso")}
          />
          {hasAccounts ? (
            <QuickAction
              icon="movements"
              label="Mover"
              onClick={() => setActiveForm("movimiento")}
            />
          ) : (
            <QuickAction icon="debt" label="Deuda" onClick={() => setActiveForm("deuda")} />
          )}
          <QuickAction icon="clock" label="Historial" href="/movimientos" />
        </div>
      </header>

      <QuickForms
        accounts={accounts}
        active={activeForm}
        onClose={() => setActiveForm(null)}
        idPrefix="hero"
      />
    </>
  );
}

/** Tile plano sobre el propio hero: círculo de tinte sólido + etiqueta
 *  debajo. Sin tarjeta ni vidrio — el fondo del hero ya separa el bloque. */
function QuickAction({
  icon,
  label,
  onClick,
  href,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <span className="grid place-items-center size-11 rounded-tile bg-on-brand-well text-on-brand">
        <Icon name={icon} size={20} />
      </span>
      <span className="text-xs font-semibold text-on-brand-muted">{label}</span>
    </>
  );
  const className =
    "flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
