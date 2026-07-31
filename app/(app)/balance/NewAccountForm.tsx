"use client";

// Formulario propio (no FormModal) porque el saldo inicial abre campos que
// dependen de lo que el usuario elija — mismo patrón que AddDebtForm en Deudas
// y NewReceivableForm en Cobros.
//
// Uno solo para las dos pantallas que crean cuentas (Balance y Ahorros), no
// uno por pantalla: lo caro acá es decidir el origen del saldo inicial y
// filtrar las cuentas compatibles por moneda, y duplicar esa lógica garantiza
// que las dos copias se desincronicen a la primera corrección.
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { parseAmount } from "@/lib/actions-shared";
import { ACCOUNT_TYPES } from "./accountTypes";
import { addAccount } from "./actions";
import type { Currency } from "@/lib/types";

type OriginAccount = { id: string; name: string; currency: Currency };

export function NewAccountForm({
  goals = [],
  accounts = [],
  triggerLabel,
  trigger = "button",
  /** 'ahorro' = pantalla de Ahorros: tipo fijo, siempre DOP, sin meta. Los
   *  campos que no aplican no se esconden con CSS, no se renderizan. */
  variant = "full",
}: {
  goals?: { id: string; name: string }[];
  accounts?: OriginAccount[];
  triggerLabel: string;
  trigger?: "button" | "pill";
  variant?: "full" | "ahorro";
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>("DOP");
  const [initial, setInitial] = useState("");
  const [origin, setOrigin] = useState<"" | "transfer" | "new_money">("");
  const [fromId, setFromId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amount = parseAmount(initial);
  const hasInitial = Number.isFinite(amount) && amount > 0;
  // Solo cuentas de la MISMA moneda: una transferencia es una sola fila con un
  // solo monto, así que entre monedas distintas no significa nada (ver
  // addTransfer en actions.ts). Si no queda ninguna, el modo transferencia ni
  // se ofrece.
  const compatible = accounts.filter((a) => a.currency === currency);

  function openModal() {
    setError(null);
    setCurrency("DOP");
    setInitial("");
    setOrigin("");
    setFromId("");
    setOpen(true);
  }

  function handleCurrency(next: Currency) {
    setCurrency(next);
    // Cambiar de moneda puede dejar sin cuentas compatibles: si el usuario ya
    // había elegido "transferencia", esa elección deja de ser válida.
    if (!accounts.some((a) => a.currency === next)) {
      setOrigin((o) => (o === "transfer" ? "" : o));
      setFromId("");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addAccount(fd);
      if (res?.ok) setOpen(false);
      else setError(res?.error ?? "Ocurrió un error.");
    });
  }

  return (
    <>
      {trigger === "pill" ? (
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-pill font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97] bg-primary-soft text-primary-fg hover:bg-primary-soft"
        >
          <Icon name="plus" size={16} />
          {triggerLabel}
        </button>
      ) : (
        <Button onClick={openModal}>
          <Icon name="plus" size={18} />
          {triggerLabel}
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={variant === "ahorro" ? "Nueva cuenta de ahorro" : "Nueva cuenta"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {variant === "ahorro" && <input type="hidden" name="type" value="ahorro" />}

          <Field
            label="Nombre"
            htmlFor="acc-name"
            required
            hint={variant === "ahorro" ? "Ej.: Ahorro efectivo, Ahorro banco…" : undefined}
          >
            <Input
              id="acc-name"
              name="name"
              placeholder={variant === "ahorro" ? "Ahorro" : "Ej.: Banco BHD, Efectivo…"}
              required
            />
          </Field>

          {variant === "full" && (
            <>
              <Field label="Tipo de cuenta" htmlFor="acc-type">
                <Select id="acc-type" name="type" defaultValue="ahorro">
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Solo al CREAR la cuenta — cambiarla después reinterpretaría
                  todo el historial de movimientos como si fuera de otra moneda. */}
              <Field
                label="Moneda"
                htmlFor="acc-currency"
                hint="RD no tiene tasa de cambio automática — la configuras tú en Configuración."
              >
                <Select
                  id="acc-currency"
                  name="currency"
                  value={currency}
                  onChange={(e) => handleCurrency(e.target.value as Currency)}
                >
                  <option value="DOP">Peso dominicano (RD$)</option>
                  <option value="USD">Dólar (US$)</option>
                  <option value="EUR">Euro (€)</option>
                </Select>
              </Field>
            </>
          )}

          <Field
            label="Saldo inicial"
            htmlFor="acc-initial"
            hint={variant === "ahorro" ? "Opcional." : "Opcional. En la moneda de esta cuenta."}
          >
            <MoneyInput
              id="acc-initial"
              name="initial_amount"
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
            />
          </Field>

          {/* Sin esta pregunta el saldo inicial entraba SIEMPRE como dinero
              nuevo, inventando plata cada vez que alguien registraba dinero que
              ya tenía en otra cuenta. No hay opción por defecto a propósito:
              adivinar mal acá descuadra el balance en silencio. */}
          {hasInitial && (
            <div className="flex flex-col gap-4 rounded-tile bg-surface-sunken p-3">
              <Field
                label="¿De dónde sale ese saldo?"
                htmlFor="acc-origin"
                required
                hint={
                  origin === "transfer"
                    ? "Se registra como una movida entre tus cuentas: tu total no cambia."
                    : origin === "new_money"
                      ? "Se registra como un depósito: tu total en cuentas sube por ese monto."
                      : "Hay que elegir: define si ese dinero ya estaba contado o entra nuevo."
                }
              >
                <Select
                  id="acc-origin"
                  name="initial_source"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as "" | "transfer" | "new_money")}
                >
                  <option value="">Elige una opción…</option>
                  {compatible.length > 0 && (
                    <option value="transfer">Ya tengo este dinero en otra cuenta</option>
                  )}
                  <option value="new_money">Es dinero que no tenía registrado</option>
                </Select>
              </Field>

              {origin === "transfer" && compatible.length > 0 && (
                <Field label="¿De cuál cuenta sale?" htmlFor="acc-from" required>
                  <Select
                    id="acc-from"
                    name="initial_from_account_id"
                    value={fromId || compatible[0].id}
                    onChange={(e) => setFromId(e.target.value)}
                  >
                    {compatible.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          {variant === "full" && goals.length > 0 && (
            <Field
              label="Vincular a una meta"
              htmlFor="acc-goal"
              hint="Opcional. El saldo de esta cuenta será el progreso de esa meta."
            >
              <Select id="acc-goal" name="goal_id" defaultValue="">
                <option value="">Sin vincular</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {error && (
            <p
              className="text-sm font-medium text-danger bg-tint-danger rounded-tile px-3 py-2 flex items-center gap-2"
              role="alert"
            >
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} full>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} full>
              Crear cuenta
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
