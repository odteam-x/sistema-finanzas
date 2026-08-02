"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import { PERSONAL_CODE_ERROR, isValidPersonalCode } from "@/lib/personalCode";
import { verifyPersonalCode } from "./actions";

export function VerifyCodeForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    const code = String(fd.get("code") ?? "");
    // Se valida acá y otra vez en el servidor: esta solo evita un viaje
    // inútil, la que manda es la del servidor.
    if (!isValidPersonalCode(code)) {
      setError(PERSONAL_CODE_ERROR);
      return;
    }
    startTransition(async () => {
      const res = await verifyPersonalCode(fd);
      // Si el código es correcto, la action redirige y nunca se llega acá.
      if (res && !res.ok) setError(res.error ?? "No se pudo verificar.");
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex flex-col gap-4"
      // El formulario se envía solo al sexto dígito (ver onComplete), así que
      // este onSubmit solo cubre el botón de respaldo.
    >
      <CodeInput
        name="code"
        autoFocus
        disabled={pending}
        onComplete={() => {
          // requestSubmit y no submit(): dispara la validación nativa y el
          // handler de React, igual que si el usuario pulsara el botón.
          formRef.current?.requestSubmit();
        }}
      />

      {error && (
        <p
          className="text-sm font-medium text-danger bg-tint-danger rounded-tile px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="alert" size={18} />
          {error}
        </p>
      )}

      <Button type="submit" loading={pending} full>
        Entrar
      </Button>
    </form>
  );
}
