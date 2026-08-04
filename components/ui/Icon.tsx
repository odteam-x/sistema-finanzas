"use client";

// Set de iconos: Unicons Line (@iconscout/react-unicons).
//
// Vienen pre-empaquetados como componentes React (nada de fetch en runtime),
// así que siguen funcionando offline como corresponde a una PWA, y el import
// nombrado deja que el bundler descarte los ~1.160 que no se usan.
//
// SOBRE EL ESTILO — Unicons libre es SOLO de contorno. El paquete sólido
// (@iconscout/react-unicons-solid) va bajo licencia de pago y no se puede
// redistribuir en un repositorio público como este. Es lo contrario del
// relleno sólido que se había adoptado antes con Phosphor "fill": el estado
// activo de la navegación ya no puede marcarse por peso de trazo, así que
// ahora se apoya solo en fondo y color, que es lo que ya hacía de todos
// modos (bg-gradient-brand + text-white en el activo).
//
// El mapa conserva el mismo `IconName` de siempre para no tocar ninguno de
// los ~40 sitios que llaman <Icon name="..." />.
import type { UniconProps } from "@iconscout/react-unicons";
import {
  UilAnalytics,
  UilAngleDown,
  UilAngleLeft,
  UilAngleRight,
  UilArrowDownLeft,
  UilArrowUpRight,
  UilBars,
  UilBell,
  UilBill,
  UilCalculator,
  UilCalendar,
  UilChartDown,
  UilChartGrowth,
  UilChartPie,
  UilCheck,
  UilClock,
  UilCog,
  UilCoins,
  UilDownloadAlt,
  UilEdit,
  UilEnvelope,
  UilExchange,
  UilExclamationTriangle,
  UilEstate,
  UilEye,
  UilEyeSlash,
  UilLightbulbAlt,
  UilLock,
  UilMoon,
  UilPalette,
  UilPause,
  UilPlay,
  UilPlus,
  UilRepeat,
  UilSearch,
  UilSignout,
  UilStar,
  UilSun,
  UilTimes,
  UilTrashAlt,
  UilTrophy,
  UilUniversity,
  UilWallet,
} from "@iconscout/react-unicons";

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

const icons: Record<IconName, (props: UniconProps) => React.ReactElement> = {
  dashboard: UilEstate,
  wallet: UilWallet,
  calendar: UilCalendar,
  budget: UilChartPie,
  goal: UilTrophy,
  debt: UilBill,
  bulb: UilLightbulbAlt,
  plus: UilPlus,
  close: UilTimes,
  trash: UilTrashAlt,
  edit: UilEdit,
  check: UilCheck,
  chevronLeft: UilAngleLeft,
  chevronRight: UilAngleRight,
  chevronDown: UilAngleDown,
  alert: UilExclamationTriangle,
  menu: UilBars,
  logout: UilSignout,
  trendUp: UilChartGrowth,
  trendDown: UilChartDown,
  calc: UilCalculator,
  clock: UilClock,
  settings: UilCog,
  eye: UilEye,
  eyeOff: UilEyeSlash,
  // Unicons no trae alcancía; las monedas son lo más cercano al ahorro.
  piggy: UilCoins,
  arrowDownLeft: UilArrowDownLeft,
  arrowUpRight: UilArrowUpRight,
  sun: UilSun,
  moon: UilMoon,
  palette: UilPalette,
  bank: UilUniversity,
  repeat: UilRepeat,
  chart: UilAnalytics,
  movements: UilExchange,
  search: UilSearch,
  bell: UilBell,
  sparkle: UilStar,
  download: UilDownloadAlt,
  lock: UilLock,
  // Tampoco hay huella dactilar en el set libre. El billete no encaja; se usa
  // el candado, que al menos comunica "seguridad" en el mismo contexto.
  fingerprint: UilLock,
  mail: UilEnvelope,
  pause: UilPause,
  play: UilPlay,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

// Sin prop `weight`: Unicons libre tiene un solo estilo (contorno), a
// diferencia de Phosphor, que traía light/regular/bold/fill/duotone. Los
// sitios que marcaban el estado activo con "fill" ahora se apoyan en el
// fondo y el color, que ya llevaban.
//
// `color="currentColor"` NO es opcional: Unicons rellena con un gris fijo
// (#a9a9a9) si no se le dice otra cosa, a diferencia de Phosphor, que hereda
// currentColor por defecto. Sin esto TODOS los iconos saldrían del mismo gris
// —el activo blanco de la navegación, los rojos de error, los teal— y las
// clases text-* de alrededor no pintarían nada.
export function Icon({ name, size = 22, className, ...props }: IconProps) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      color="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
}
