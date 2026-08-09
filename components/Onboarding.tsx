"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { skipOnboardingStep } from "@/app/(app)/onboarding-actions";

/** Primeros pasos.
 *
 *  NO es un modal ni un tour con flechas: es un bloque más del Inicio, así que
 *  se puede explorar la app entera sin cerrarlo. Un onboarding que bloquea es
 *  una barrera, no una guía.
 *
 *  Los cinco pasos van en orden de DEPENDENCIA, no de importancia: cada uno
 *  desbloquea al siguiente. Sin cuenta no hay de dónde salga el dinero; sin
 *  ciclo de cobro las quincenas salen de un default que no es suyo; sin un
 *  gasto no hay promedio que calcular.
 *
 *  Los dos últimos se pueden omitir. Los tres primeros no: saltárselos deja la
 *  app enseñando cifras que no significan nada. */

export interface OnboardingSignals {
  hasAccounts: boolean;
  payCycleConfirmed: boolean;
  hasExpenses: boolean;
  hasDebts: boolean;
  codeActive: boolean;
  /** Pasos opcionales que el usuario descartó con "Ahora no" (v33). */
  skipped: string[];
}

interface Paso {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  done: boolean;
  /** Solo los opcionales llevan "Ahora no". */
  omitible: boolean;
  cta: { label: string; href: string };
}

function pasosDe(s: OnboardingSignals): Paso[] {
  return [
    {
      id: "cuenta",
      icon: "bank",
      title: "Crea tu primera cuenta",
      description:
        "Efectivo, banco, lo que uses. Todo gasto o ingreso sale o entra de una cuenta, así que este paso va primero.",
      done: s.hasAccounts,
      omitible: false,
      cta: { label: "Crear cuenta", href: "/balance" },
    },
    {
      id: "cobro",
      icon: "wallet",
      title: "Configura tu ciclo de cobro",
      description:
        "Sin esto, tus quincenas y tu presupuesto por día salen de los días 15 y 30, que es lo que trae la app por defecto.",
      done: s.payCycleConfirmed,
      omitible: false,
      cta: { label: "Decir cuándo cobro", href: "/ingresos" },
    },
    {
      id: "gasto",
      icon: "budget",
      title: "Registra tu primer gasto",
      description:
        "Es lo que vas a repetir a diario. Tu promedio por día se calcula de lo que registres, no de un presupuesto que tengas que inventar.",
      done: s.hasExpenses,
      omitible: false,
      cta: { label: "Registrar un gasto", href: "/presupuesto" },
    },
    {
      id: "deudas",
      icon: "debt",
      title: "Anota lo que debes",
      description:
        "Opcional, pero es lo que enciende los avisos de vencimiento y el cálculo de cuánto te queda libre del próximo cobro.",
      done: s.hasDebts,
      omitible: true,
      cta: { label: "Anotar una deuda", href: "/deudas" },
    },
    {
      id: "seguridad",
      icon: "fingerprint",
      title: "Protege tu cuenta",
      description:
        "Un código de 6 dígitos para que nadie que tome tu teléfono desbloqueado vea tus cuentas.",
      done: s.codeActive,
      omitible: true,
      cta: { label: "Poner un código", href: "/configuracion" },
    },
  ];
}

function Fila({ paso, onOmitir, pendiente }: { paso: Paso; onOmitir: () => void; pendiente: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "grid place-items-center size-9 shrink-0 rounded-pill",
          paso.done
            ? "bg-tint-income text-income"
            : "bg-tint-brand text-primary-fg",
        )}
      >
        <Icon name={paso.done ? "check" : paso.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{paso.title}</p>
        {!paso.done && <p className="text-xs text-muted mt-0.5">{paso.description}</p>}
        {!paso.done && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Link
              href={paso.cta.href}
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary text-on-brand px-3.5 min-h-11 text-sm font-semibold"
            >
              <Icon name={paso.icon} size={16} />
              {paso.cta.label}
            </Link>
            {paso.omitible && (
              <button
                onClick={onOmitir}
                disabled={pendiente}
                className="touch-target text-sm font-semibold text-muted cursor-pointer disabled:opacity-50"
              >
                Ahora no
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function Onboarding(props: OnboardingSignals) {
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  const pasos = pasosDe(props);
  const omitido = (p: Paso) => p.omitible && props.skipped.includes(p.id);
  const resuelto = (p: Paso) => p.done || omitido(p);

  const hechos = pasos.filter((p) => p.done).length;
  const obligatoriosPendientes = pasos.filter((p) => !p.omitible && !p.done);
  const opcionalesPendientes = pasos.filter((p) => p.omitible && !resuelto(p));

  // Todo hecho u omitido: no queda nada que enseñar y no vuelve a aparecer.
  if (obligatoriosPendientes.length === 0 && opcionalesPendientes.length === 0) return null;

  // COLAPSADO cuando solo faltan opcionales. No desaparece: quien omitió el
  // paso 5 puede volver a él sin ir a buscarlo a Configuración — pero tampoco
  // sigue ocupando media pantalla por algo que ya dijo que no quería ahora.
  const soloOpcionales = obligatoriosPendientes.length === 0;

  // UN SOLO CTA a la vez: el del siguiente pendiente. Cinco botones compitiendo
  // no es una guía, es una lista de tareas.
  const siguiente = obligatoriosPendientes[0] ?? opcionalesPendientes[0];
  const visibles = abierto || soloOpcionales ? pasos.filter((p) => !resuelto(p)) : [siguiente];

  function omitir(id: string) {
    startTransition(() => {
      void skipOnboardingStep(id);
    });
  }

  return (
    <Card className="mb-6">
      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-bold text-ink">Empecemos</h2>
          {/* "2 de 5", sin porcentaje y sin gamificación: configurar la app no
              es un logro, es una tarea. La regla de celebración de la Fase 25
              deja eso solo para Ahorros. */}
          <p className="text-xs font-semibold text-muted tabular shrink-0">
            {hechos} de {pasos.length}
          </p>
        </div>
        <div className="mt-2 h-1 w-full rounded-pill bg-surface-sunken overflow-hidden">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-500"
            style={{ width: `${(hechos / pasos.length) * 100}%` }}
          />
        </div>
      </div>

      {soloOpcionales && (
        <p className="text-xs text-muted mb-3">
          Lo esencial ya está. Esto es opcional, pero te va a servir.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {visibles.map((p) => (
          <Fila key={p.id} paso={p} pendiente={pendiente} onOmitir={() => omitir(p.id)} />
        ))}
      </ol>

      {/* Ver el resto solo tiene sentido si hay resto. Con los obligatorios
          pendientes ya se listan todos, así que el botón sobra. */}
      {!soloOpcionales && obligatoriosPendientes.length + opcionalesPendientes.length > 1 && (
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="mt-3 flex items-center gap-1 min-h-11 text-xs font-semibold text-primary-fg cursor-pointer"
        >
          <Icon
            name="chevronDown"
            size={15}
            className={cn("transition-transform", abierto && "rotate-180")}
          />
          {abierto
            ? "Ver solo el siguiente"
            : `Ver los ${obligatoriosPendientes.length + opcionalesPendientes.length} que faltan`}
        </button>
      )}
    </Card>
  );
}
