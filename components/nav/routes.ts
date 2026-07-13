import type { IconName } from "@/components/ui/Icon";

export interface NavRoute {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  primary: boolean; // aparece directo en la tab bar móvil
}

export const NAV_ROUTES: NavRoute[] = [
  { href: "/dashboard", label: "Inicio", shortLabel: "Inicio", icon: "dashboard", primary: true },
  { href: "/ingresos", label: "Ingresos", shortLabel: "Ingresos", icon: "wallet", primary: true },
  { href: "/calendario", label: "Calendario", shortLabel: "Días", icon: "calendar", primary: true },
  { href: "/presupuesto", label: "Presupuesto", shortLabel: "Gastos", icon: "budget", primary: true },
  { href: "/ahorros", label: "Ahorros", shortLabel: "Ahorros", icon: "piggy", primary: false },
  { href: "/metas", label: "Metas", shortLabel: "Metas", icon: "goal", primary: false },
  { href: "/deudas", label: "Deudas", shortLabel: "Deudas", icon: "debt", primary: false },
  { href: "/sugerencias", label: "Consejos", shortLabel: "Consejos", icon: "bulb", primary: false },
];

export const PRIMARY_ROUTES = NAV_ROUTES.filter((r) => r.primary);
export const SECONDARY_ROUTES = NAV_ROUTES.filter((r) => !r.primary);
