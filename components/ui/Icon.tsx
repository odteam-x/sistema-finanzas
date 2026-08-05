"use client";

// Set de iconos: Phosphor (@phosphor-icons/react).
//
// Vienen pre-empaquetados como componentes React (nada de fetch en runtime),
// así que siguen funcionando offline como corresponde a una PWA, y el import
// nombrado deja que el bundler descarte los ~2.980 que no se usan.
//
// POR QUÉ PHOSPHOR Y NO TABLER — el relleno. En Tabler el relleno es un icono
// APARTE, y de nuestros 44 nombres solo 31 lo tenían; tras descartar los que
// se veían mal quedaban 20. Eso obligaba a un set mezclado, y por eso la regla
// de "relleno por defecto" nunca se pudo aplicar. En Phosphor el peso es una
// PROP del mismo icono, así que la cobertura de relleno es 44/44 por
// construcción: no hay caso que no se pueda rellenar.
//
// Además sus terminaciones redondeadas acompañan mejor a los radios generosos
// del sistema (20-28px) que el trazo cuadrado de Tabler.
//
// Como Unicons y a diferencia de aquel, Phosphor hereda `currentColor` por
// defecto, así que no hace falta forzárselo.
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsLeftRight,
  Bank,
  Bell,
  Calculator,
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartBar,
  ChartPie,
  Check,
  Clock,
  DownloadSimple,
  Envelope,
  Eye,
  EyeSlash,
  Fingerprint,
  Gear,
  House,
  Lightbulb,
  List,
  Lock,
  MagnifyingGlass,
  Moon,
  Palette,
  Pause,
  PencilSimple,
  PiggyBank,
  Play,
  Plus,
  Receipt,
  Repeat,
  SignOut,
  Sparkle,
  Sun,
  Trash,
  TrendDown,
  TrendUp,
  Trophy,
  Wallet,
  Warning,
  X,
} from "@phosphor-icons/react";

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

const icons: Record<IconName, PhosphorIcon> = {
  dashboard: House,
  wallet: Wallet,
  calendar: Calendar,
  budget: ChartPie,
  goal: Trophy,
  debt: Receipt,
  bulb: Lightbulb,
  plus: Plus,
  close: X,
  trash: Trash,
  // PencilSimple y no Pencil: el simple es un lápiz sin la punta detallada,
  // que a 20px es lo único que se distingue.
  edit: PencilSimple,
  check: Check,
  // Caret y no Arrow para los chevrones: el caret es la punta sola, que es lo
  // que marca "hay más" sin leerse como "ve hacia allá".
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronDown: CaretDown,
  alert: Warning,
  menu: List,
  logout: SignOut,
  trendUp: TrendUp,
  trendDown: TrendDown,
  calc: Calculator,
  clock: Clock,
  settings: Gear,
  eye: Eye,
  eyeOff: EyeSlash,
  // Por fin una alcancía de verdad: con Tabler había que elegir entre el cerdo
  // sin moneda o quedarse sin relleno, y con Unicons no existía.
  piggy: PiggyBank,
  arrowDownLeft: ArrowDownLeft,
  arrowUpRight: ArrowUpRight,
  sun: Sun,
  moon: Moon,
  palette: Palette,
  bank: Bank,
  repeat: Repeat,
  chart: ChartBar,
  movements: ArrowsLeftRight,
  search: MagnifyingGlass,
  bell: Bell,
  sparkle: Sparkle,
  download: DownloadSimple,
  lock: Lock,
  // Y una huella real: los dos sets anteriores no la tenían y caía en el
  // candado, que decía "seguridad" pero no "huella".
  fingerprint: Fingerprint,
  mail: Envelope,
  pause: Pause,
  play: Play,
};

interface IconProps {
  name: IconName;
  size?: number;
  /** Pinta la variante rellena. La usa la navegación para la sección activa y
   *  el ícono de una meta lograda. A diferencia de antes, funciona con los 44:
   *  el peso es una prop del icono, no un icono distinto. */
  filled?: boolean;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function Icon({ name, size = 22, filled = false, className, ...props }: IconProps) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      weight={filled ? "fill" : "regular"}
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
}
