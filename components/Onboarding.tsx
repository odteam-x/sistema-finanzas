import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NewAccountForm } from "@/app/(app)/balance/NewAccountForm";

/** Primeros pasos, solo mientras la cuenta está vacía.
 *
 *  Un usuario recién registrado caía en el Inicio con todo en cero: el saldo
 *  en RD$0, ninguna alerta, ninguna sección con nada dentro. Nada estaba roto
 *  —los cálculos aguantan el cero— pero tampoco decía por dónde empezar, y el
 *  primer paso no es evidente: registrar un gasto necesita una cuenta de la
 *  que salga, porque el ledger es la única fuente de verdad del balance.
 *
 *  Desaparece sola en cuanto hay una cuenta: no es un asistente con estado
 *  que haya que completar ni marcar como visto. */
function Step({
  icon,
  title,
  description,
  done,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  done: boolean;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          done
            ? "grid place-items-center size-9 shrink-0 rounded-pill bg-tint-income text-income"
            : "grid place-items-center size-9 shrink-0 rounded-pill bg-tint-brand text-primary-fg"
        }
      >
        <Icon name={done ? "check" : icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
        {!done && action && <div className="mt-2">{action}</div>}
      </div>
    </li>
  );
}

export function Onboarding({
  hasAccounts,
  hasExpenses,
  hasSalarySettings,
}: {
  hasAccounts: boolean;
  hasExpenses: boolean;
  hasSalarySettings: boolean;
}) {
  return (
    <Card className="mb-6">
      <div className="mb-3">
        <h2 className="font-bold text-ink">Empecemos</h2>
        <p className="text-xs text-muted mt-0.5">
          Tres pasos para que los números de esta pantalla signifiquen algo.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        <Step
          icon="bank"
          title="Crea tu primera cuenta"
          description="Efectivo, banco, lo que uses. Todo gasto o ingreso sale o entra de una cuenta, así que este paso va primero."
          done={hasAccounts}
          action={<NewAccountForm accounts={[]} triggerLabel="Crear cuenta" />}
        />
        <Step
          icon="budget"
          title="Registra un gasto"
          description="Con el botón + de abajo. Tu promedio de gasto por día se calcula de lo que registres, no de un presupuesto que tengas que inventar."
          done={hasExpenses}
        />
        <Step
          icon="wallet"
          title="Dinos cuándo cobras"
          description="Para que el ingreso se registre solo cada quincena y sepamos cuánto falta para el próximo."
          done={hasSalarySettings}
          action={
            <Link
              href="/ingresos"
              className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3.5 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors"
            >
              <Icon name="wallet" size={16} />
              Configurar
            </Link>
          }
        />
      </ol>
    </Card>
  );
}
