"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { LoginState } from "./actions";

const initial: LoginState = { error: null, notice: null };

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={id} required hint={hint}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-pill text-muted hover:bg-surface-sunken cursor-pointer"
        >
          <Icon name={show ? "eyeOff" : "eye"} size={18} />
        </button>
      </div>
    </Field>
  );
}

/** Los cuatro formularios de autenticación comparten estructura (campos,
 *  aviso de error, aviso de éxito, botón) y solo cambian en qué campos
 *  piden. Antes solo existía el de entrar; con cuatro copias sueltas, el
 *  bloque de error se habría desincronizado entre pantallas. */
export function AuthForm({
  action,
  submitLabel,
  variant,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  submitLabel: string;
  variant: "login" | "signup" | "reset" | "new-password";
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  const needsEmail = variant !== "new-password";
  const needsPassword = variant !== "reset";
  const needsConfirm = variant === "signup" || variant === "new-password";

  // Tras un aviso de "revisa tu correo" no tiene sentido dejar el formulario:
  // el siguiente paso está en la bandeja de entrada, no acá.
  if (state.notice) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid place-items-center size-12 rounded-pill bg-tint-brand text-primary-fg">
          <Icon name="mail" size={24} />
        </span>
        <p className="text-sm text-ink">{state.notice}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {needsEmail && (
        <Field label="Correo" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </Field>
      )}

      {needsPassword && (
        <PasswordField
          id="password"
          name="password"
          label={variant === "new-password" ? "Contraseña nueva" : "Contraseña"}
          autoComplete={variant === "login" ? "current-password" : "new-password"}
          hint={needsConfirm ? "Mínimo 8 caracteres." : undefined}
        />
      )}

      {needsConfirm && (
        <PasswordField
          id="password_confirm"
          name="password_confirm"
          label="Repite la contraseña"
          autoComplete="new-password"
        />
      )}

      {state.error && (
        <p
          className="text-sm font-medium text-danger bg-tint-danger rounded-tile px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="alert" size={18} />
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} full size="md">
        {submitLabel}
      </Button>
    </form>
  );
}
