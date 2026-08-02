"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";
import { CodeInput } from "@/components/ui/CodeInput";
import { revealPersonalCode, resetPersonalCode } from "./actions";

type Mode = "elegir" | "mostrar" | "nuevo";

export function RecoverCodeForm() {
  const [mode, setMode] = useState<Mode>("elegir");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fd: FormData, kind: Exclude<Mode, "elegir">) {
    setError(null);
    startTransition(async () => {
      if (kind === "mostrar") {
        const res = await revealPersonalCode(fd);
        if (res.ok && res.code) setRevealed(res.code);
        else setError(res.error ?? "No se pudo verificar.");
        return;
      }
      const res = await resetPersonalCode(fd);
      if (res.ok) router.replace("/dashboard");
      else setError(res.error ?? "No se pudo guardar.");
    });
  }

  if (revealed) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-muted">Tu código personal es:</p>
        <p className="text-3xl font-extrabold tabular tracking-[0.3em] text-ink">{revealed}</p>
        <p className="text-xs text-muted">
          Si crees que alguien más lo vio, vuelve atrás y asigna uno nuevo.
        </p>
        <Button onClick={() => router.replace("/verificar")} full>
          Ingresarlo ahora
        </Button>
      </div>
    );
  }

  if (mode === "elegir") {
    return (
      <div className="flex flex-col gap-3">
        {/* Dos caminos, no uno: mostrarlo es más rápido, asignar uno nuevo es
            mejor si sospechas que alguien más lo vio. Decide el usuario. */}
        <Button onClick={() => setMode("mostrar")} full>
          <Icon name="eye" size={18} />
          Mostrar mi código actual
        </Button>
        <Button variant="secondary" onClick={() => setMode("nuevo")} full>
          <Icon name="edit" size={18} />
          Asignar uno nuevo
        </Button>
      </div>
    );
  }

  return (
    <form action={(fd) => run(fd, mode)} className="flex flex-col gap-4">
      {/* La contraseña de la cuenta, no el código: si ya se te olvidó, no
          puede recuperarse a sí mismo. */}
      <Field
        label="Tu contraseña"
        htmlFor="rc-password"
        required
        hint="La de tu cuenta, para confirmar que eres tú."
      >
        <Input
          id="rc-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {mode === "nuevo" && (
        <>
          <Field label="Código nuevo" htmlFor="rc-code" required>
            <CodeInput name="code" aria-label="Código nuevo" disabled={pending} />
          </Field>
          <Field label="Repítelo" htmlFor="rc-code2" required>
            <CodeInput name="code_confirm" aria-label="Repite el código nuevo" disabled={pending} />
          </Field>
        </>
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

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setMode("elegir")} full>
          Atrás
        </Button>
        <Button type="submit" loading={pending} full>
          {mode === "mostrar" ? "Mostrar" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
