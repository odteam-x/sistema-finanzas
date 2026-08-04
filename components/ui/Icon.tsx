"use client";

// Set de iconos: Tabler (@tabler/icons-react).
//
// Vienen pre-empaquetados como componentes React (nada de fetch en runtime),
// así que siguen funcionando offline como corresponde a una PWA, y el import
// nombrado deja que el bundler descarte los ~6.140 que no se usan.
//
// SOBRE EL RELLENO — Tabler publica contorno y relleno bajo la misma licencia
// MIT, sin la barrera de pago que tenía Unicons. El relleno cubre 31 de
// nuestros 44 nombres; los 13 restantes se quedan en contorno también cuando
// están activos. Eso NO se nota: `filled` solo lo usa la navegación para
// marcar la sección actual, y solo hay UNA sección actual a la vez, así que
// nunca se ven un relleno y un contorno lado a lado como estados equivalentes.
//
// A diferencia de Unicons, Tabler ya usa `color = "currentColor"` por defecto,
// así que no hace falta forzarlo: los text-* de alrededor pintan el icono.
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBell,
  IconBellFilled,
  IconBuildingBank,
  IconBulb,
  IconBulbFilled,
  IconCalculator,
  IconCalculatorFilled,
  IconCalendar,
  IconCalendarFilled,
  IconChartBar,
  IconChartPie,
  IconChartPieFilled,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconClockFilled,
  IconDownload,
  IconExchange,
  IconExchangeFilled,
  IconEye,
  IconEyeFilled,
  IconEyeOff,
  IconFileInvoice,
  IconFileInvoiceFilled,
  IconFingerprint,
  IconHome,
  IconHomeFilled,
  IconLock,
  IconLockFilled,
  IconLogout,
  IconMail,
  IconMailFilled,
  IconMenu2,
  IconMoon,
  IconMoonFilled,
  IconPalette,
  IconPencil,
  IconPigMoney,
  IconPlayerPause,
  IconPlayerPauseFilled,
  IconPlayerPlay,
  IconPlayerPlayFilled,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconSettings,
  IconSettingsFilled,
  IconSparkles,
  IconSun,
  IconSunFilled,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconTrophy,
  IconTrophyFilled,
  IconWallet,
  IconX,
} from "@tabler/icons-react";

export type IconName =
  | "dashboard"
  | "wallet"
  | "calendar"
  | "budget"
  | "goal"
  | "debt"
  | "bulb"
  | "plus"
  | "close"
  | "trash"
  | "edit"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "alert"
  | "menu"
  | "logout"
  | "trendUp"
  | "trendDown"
  | "calc"
  | "clock"
  | "settings"
  | "eye"
  | "eyeOff"
  | "piggy"
  | "arrowDownLeft"
  | "arrowUpRight"
  | "sun"
  | "moon"
  | "palette"
  | "bank"
  | "repeat"
  | "chart"
  | "movements"
  | "search"
  | "bell"
  | "sparkle"
  | "download"
  | "lock"
  | "fingerprint"
  // Avisos de "revisa tu correo" del registro y la recuperación de contraseña.
  | "mail"
  // Pausar / reanudar una suscripcion (21.1).
  | "pause"
  | "play";

const outline: Record<IconName, TablerIcon> = {
  dashboard: IconHome,
  wallet: IconWallet,
  calendar: IconCalendar,
  budget: IconChartPie,
  goal: IconTrophy,
  debt: IconFileInvoice,
  bulb: IconBulb,
  plus: IconPlus,
  close: IconX,
  trash: IconTrash,
  edit: IconPencil,
  check: IconCheck,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight,
  chevronDown: IconChevronDown,
  alert: IconAlertTriangle,
  menu: IconMenu2,
  logout: IconLogout,
  trendUp: IconTrendingUp,
  trendDown: IconTrendingDown,
  calc: IconCalculator,
  clock: IconClock,
  settings: IconSettings,
  eye: IconEye,
  eyeOff: IconEyeOff,
  // Tabler sí trae alcancía. Se usa la variante con la moneda (PigMoney) y no
  // el cerdo a secas, aunque el relleno solo exista para el segundo: cambiar
  // de glifo entre activo e inactivo parecería otro icono, no el mismo lleno.
  piggy: IconPigMoney,
  arrowDownLeft: IconArrowDownLeft,
  arrowUpRight: IconArrowUpRight,
  sun: IconSun,
  moon: IconMoon,
  palette: IconPalette,
  bank: IconBuildingBank,
  repeat: IconRepeat,
  chart: IconChartBar,
  movements: IconExchange,
  search: IconSearch,
  bell: IconBell,
  sparkle: IconSparkles,
  download: IconDownload,
  lock: IconLock,
  fingerprint: IconFingerprint,
  mail: IconMail,
  pause: IconPlayerPause,
  play: IconPlayerPlay,
};

/* Solo los que tienen relleno en Tabler. Es parcial a propósito: el que falta
   cae en el contorno de arriba en vez de romper, así que añadir un icono nuevo
   nunca obliga a buscarle un relleno que quizá no exista.

   Se dejan fuera algunos que SÍ tienen relleno pero donde no significa nada
   (plus, close, check, chevrones, trash, edit): son glifos de trazo y su
   versión rellena es una silueta maciza que no se parece al original. */
const filledByName: Partial<Record<IconName, TablerIcon>> = {
  dashboard: IconHomeFilled,
  calendar: IconCalendarFilled,
  budget: IconChartPieFilled,
  goal: IconTrophyFilled,
  debt: IconFileInvoiceFilled,
  bulb: IconBulbFilled,
  alert: IconAlertTriangleFilled,
  calc: IconCalculatorFilled,
  clock: IconClockFilled,
  settings: IconSettingsFilled,
  eye: IconEyeFilled,
  sun: IconSunFilled,
  moon: IconMoonFilled,
  movements: IconExchangeFilled,
  bell: IconBellFilled,
  lock: IconLockFilled,
  mail: IconMailFilled,
  pause: IconPlayerPauseFilled,
  play: IconPlayerPlayFilled,
};

interface IconProps {
  name: IconName;
  size?: number;
  /** Pinta la variante rellena, si el icono tiene una. Lo usa la navegación
   *  para la sección activa; si no existe relleno, cae al contorno y el estado
   *  activo sigue distinguiéndose por color y fondo como hasta ahora. */
  filled?: boolean;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function Icon({ name, size = 22, filled = false, className, ...props }: IconProps) {
  const Component = (filled && filledByName[name]) || outline[name];
  return <Component size={size} className={className} aria-hidden="true" {...props} />;
}
