"use client";

// Set de iconos: Phosphor (@phosphor-icons/react) — reemplaza el set propio
// dibujado a mano de la Fase 0-4. Los componentes de Phosphor vienen
// pre-empaquetados (nada de fetch a una API en runtime), así que siguen
// funcionando offline como corresponde a una PWA. El mapa de nombres
// conserva el mismo `IconName` que usaba el set anterior para no tocar
// ninguno de los ~40 sitios que ya llaman <Icon name="..." />.
import type { IconWeight } from "@phosphor-icons/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsClockwise,
  ArrowsLeftRight,
  Bank,
  Bell,
  Calculator,
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  Clock,
  Coins,
  CreditCard,
  DownloadSimple,
  Eye,
  Fingerprint,
  EyeSlash,
  Gear,
  House,
  Lightbulb,
  List,
  Lock,
  MagnifyingGlass,
  Moon,
  Palette,
  PencilSimple,
  PiggyBank,
  Plus,
  SignOut,
  Sparkle,
  Sun,
  Target,
  Trash,
  TrendDown,
  TrendUp,
  Wallet,
  WarningCircle,
  X,
  type Icon as PhosphorIcon,
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
  | "fingerprint";

const icons: Record<IconName, PhosphorIcon> = {
  dashboard: House,
  wallet: Wallet,
  calendar: Calendar,
  budget: Coins,
  goal: Target,
  debt: CreditCard,
  bulb: Lightbulb,
  plus: Plus,
  close: X,
  trash: Trash,
  edit: PencilSimple,
  check: Check,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronDown: CaretDown,
  alert: WarningCircle,
  menu: List,
  logout: SignOut,
  trendUp: TrendUp,
  trendDown: TrendDown,
  calc: Calculator,
  clock: Clock,
  settings: Gear,
  eye: Eye,
  eyeOff: EyeSlash,
  piggy: PiggyBank,
  arrowDownLeft: ArrowDownLeft,
  arrowUpRight: ArrowUpRight,
  sun: Sun,
  moon: Moon,
  palette: Palette,
  bank: Bank,
  repeat: ArrowsClockwise,
  chart: ChartBar,
  movements: ArrowsLeftRight,
  search: MagnifyingGlass,
  bell: Bell,
  sparkle: Sparkle,
  download: DownloadSimple,
  lock: Lock,
  fingerprint: Fingerprint,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** El default es "fill". Pásalo explícito solo para apartarte de eso: la
   *  navegación usa "light" en lo inactivo para que el relleno marque el
   *  estado activo, y un glifo con detalle interno fino que se vea manchado
   *  en sólido a tamaño chico se rescata con "duotone". */
  weight?: IconWeight;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

// "fill": glifo sólido, el lenguaje visual que la app usa dentro de las
// burbujas de color (IconBubble). Pasó por "light" y "regular" antes: los dos
// eran de contorno y a 14-16px se perdían contra el texto que acompañan, en
// vez de anclarlo. Los sitios que sí quieren otra cosa ya pasan `weight`
// explícito — la navegación ("light" inactivo), el recibo y el asistente. El
// peso se cambia UNA vez acá y se propaga a las ~42 llamadas de la app.
export function Icon({ name, size = 22, className, weight = "fill", ...props }: IconProps) {
  const Component = icons[name];
  return <Component size={size} weight={weight} className={className} aria-hidden="true" {...props} />;
}
