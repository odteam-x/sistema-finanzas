"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { payCushionQuincena } from "./actions";

/** "Pagarme esta quincena": un tap, sin formulario — el monto y la cuenta
 *  destino ya están configurados en la propia cuenta colchón (ver
 *  CushionField.tsx). */
export function PayCushionButton() {
  const [pending, startTransition] = useTransition();

  function pay() {
    startTransition(async () => {
      await payCushionQuincena();
    });
  }

  return (
    <button
      onClick={pay}
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 min-h-9 rounded-full bg-primary text-white font-bold text-xs px-3.5 cursor-pointer transition-colors hover:brightness-95 disabled:opacity-60 active:scale-[0.97] shrink-0"
    >
      {pending ? (
        <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <Icon name="arrowUpRight" size={14} />
      )}
      {pending ? "Pagando…" : "Pagarme esta quincena"}
    </button>
  );
}
