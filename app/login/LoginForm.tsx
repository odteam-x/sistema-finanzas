"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <Field label="Contraseña" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full text-muted hover:bg-black/5 cursor-pointer"
          >
            <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
          </button>
        </div>
      </Field>

      {state.error && (
        <p
          className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="alert" size={18} />
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} full size="md">
        Entrar
      </Button>
    </form>
  );
}
