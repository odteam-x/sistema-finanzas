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
  Eye,
  EyeSlash,
  Gear,
  House,
  Lightbulb,
  List,
  Moon,
  Palette,
  PencilSimple,
  PiggyBank,
  Plus,
  SignOut,
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
  | "movements";

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
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** "regular" inactivo / "fill" activo es el patrón recomendado para
   *  estados seleccionados (tabs, filtros) — por defecto "bold" para
   *  mantener el peso visual que tenía el set dibujado a mano. */
  weight?: IconWeight;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function Icon({ name, size = 22, className, weight = "bold", ...props }: IconProps) {
  const Component = icons[name];
  return <Component size={size} weight={weight} className={className} aria-hidden="true" {...props} />;
}
