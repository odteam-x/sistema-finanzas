// Catálogo de tipos de cuenta. Vive en su propio módulo (sin "use client" ni
// "use server") porque lo necesitan las dos orillas: la página de Balance, que
// es un componente de servidor, y NewAccountForm, que es de cliente. `IconName`
// entra como tipo, así que se borra en compilación y este módulo no arrastra
// Icon.tsx al bundle del servidor.
import type { IconName } from "@/components/ui/Icon";
import type { AccountType } from "@/lib/types";

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: IconName }[] = [
  { value: "ahorro", label: "Ahorro / Alcancía", icon: "piggy" },
  { value: "banco", label: "Banco", icon: "bank" },
  { value: "efectivo", label: "Efectivo", icon: "wallet" },
  { value: "tarjeta_debito", label: "Tarjeta débito", icon: "debt" },
  { value: "tarjeta_credito", label: "Tarjeta crédito", icon: "debt" },
];

export const typeInfo = (type: AccountType) =>
  ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0];
