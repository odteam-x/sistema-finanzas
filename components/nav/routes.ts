import type { IconName } from "@/components/ui/Icon";

/** Orden en el que se pintan los grupos. El TIPO sale de este array (y no al
 *  revés) para que no puedan desincronizarse: declarar un grupo en el tipo y
 *  olvidarlo en el orden dejaría esas rutas invisibles en el menú "Más", sin
 *  que TypeScript dijera nada. */
const GROUP_ORDER = ["principal", "dinero", "compromisos", "planeacion", "cuenta"] as const;

export type NavGroup = (typeof GROUP_ORDER)[number];

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  principal: "Principal",
  dinero: "Dinero",
  compromisos: "Compromisos",
  planeacion: "Planeación",
  cuenta: "Cuenta",
};

export interface NavRoute {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  primary: boolean; // aparece directo en la tab bar móvil
  /** Sección bajo la que se agrupa. Obligatorio a propósito: si fuera
   *  opcional, una ruta nueva se caería del menú sin error de compilación. */
  group: NavGroup;
}

export const NAV_ROUTES: NavRoute[] = [
  { href: "/dashboard", label: "Inicio", shortLabel: "Inicio", icon: "dashboard", primary: true, group: "principal" },
  { href: "/movimientos", label: "Movimientos", shortLabel: "Movim.", icon: "movements", primary: true, group: "principal" },
  { href: "/presupuesto", label: "Gastos", shortLabel: "Gastos", icon: "budget", primary: true, group: "principal" },

  // Dinero: dónde ESTÁ tu dinero y por dónde entra. Ahorros va acá y no en
  // Planeación porque una meta se respalda con una cuenta de ahorro real
  // (savings_accounts.goal_id) — es saldo, no un plan.
  { href: "/ingresos", label: "Ingresos", shortLabel: "Ingresos", icon: "wallet", primary: false, group: "dinero" },
  { href: "/balance", label: "Balance", shortLabel: "Balance", icon: "bank", primary: false, group: "dinero" },
  // 'piggy', no 'goal': es el mismo icono que usa "Total ahorrado" en Inicio,
  // y el mismo concepto debe verse igual en toda la app.
  { href: "/metas", label: "Ahorros", shortLabel: "Ahorros", icon: "piggy", primary: false, group: "dinero" },

  // Compromisos: dinero ya comprometido con alguien más, en las dos
  // direcciones (lo que debes, lo que te deben, lo que se te va solo).
  { href: "/deudas", label: "Deudas", shortLabel: "Deudas", icon: "debt", primary: false, group: "compromisos" },
  { href: "/cobros", label: "Por cobrar", shortLabel: "Cobrar", icon: "arrowDownLeft", primary: false, group: "compromisos" },
  { href: "/suscripciones", label: "Suscripciones", shortLabel: "Suscrip.", icon: "repeat", primary: false, group: "compromisos" },

  // Planeación: ninguna de estas registra dinero; todas miran hacia adelante
  // o hacia atrás para decidir, no para anotar.
  { href: "/calendario", label: "Calendario", shortLabel: "Días", icon: "calendar", primary: false, group: "planeacion" },
  { href: "/calculadoras", label: "Calculadoras", shortLabel: "Calc.", icon: "calc", primary: false, group: "planeacion" },
  { href: "/reportes", label: "Reportes", shortLabel: "Reportes", icon: "chart", primary: false, group: "planeacion" },
  { href: "/sugerencias", label: "Consejos", shortLabel: "Consejos", icon: "bulb", primary: false, group: "planeacion" },

  { href: "/configuracion", label: "Configuración", shortLabel: "Ajustes", icon: "settings", primary: false, group: "cuenta" },
];

export const PRIMARY_ROUTES = NAV_ROUTES.filter((r) => r.primary);
export const SECONDARY_ROUTES = NAV_ROUTES.filter((r) => !r.primary);

export interface NavGroupBlock {
  group: NavGroup;
  label: string;
  routes: NavRoute[];
}

/** Las rutas repartidas en sus grupos: orden de GROUP_ORDER por fuera, orden
 *  de NAV_ROUTES por dentro. Un grupo sin rutas no se emite — así quitar la
 *  última ruta de una sección no deja un encabezado suelto sobre una rejilla
 *  en blanco. */
export const NAV_GROUPS: NavGroupBlock[] = GROUP_ORDER.map((group) => ({
  group,
  label: NAV_GROUP_LABEL[group],
  routes: NAV_ROUTES.filter((r) => r.group === group),
})).filter((g) => g.routes.length > 0);

/** Lo que enseña el menú "Más": los mismos grupos sin lo que ya está en la
 *  tab bar. 'principal' se cae solo, sin excluirlo a mano. */
export const SECONDARY_GROUPS: NavGroupBlock[] = NAV_GROUPS.map((g) => ({
  ...g,
  routes: g.routes.filter((r) => !r.primary),
})).filter((g) => g.routes.length > 0);
