// @iconscout/react-unicons no publica tipos propios ni existe un paquete
// @types/... para él, así que TypeScript lo trataría como `any` implícito y el
// build falla con `noImplicitAny`.
//
// Se declaran SOLO los ~42 iconos que la app usa, y no los ~1.200 del paquete,
// por dos razones: el archivo se mantiene legible, y añadir un icono nuevo
// obliga a pasar por acá — que es justo donde está el mapa de nombres
// (components/ui/Icon.tsx). Un nombre mal escrito sigue siendo un error de
// compilación, no un undefined en tiempo de ejecución.
declare module "@iconscout/react-unicons" {
  import type { ReactElement, SVGProps } from "react";

  export interface UniconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
    size?: number | string;
    color?: string;
  }

  type Unicon = (props: UniconProps) => ReactElement;

  export const UilAnalytics: Unicon;
  export const UilAngleDown: Unicon;
  export const UilAngleLeft: Unicon;
  export const UilAngleRight: Unicon;
  export const UilArrowDownLeft: Unicon;
  export const UilArrowUpRight: Unicon;
  export const UilBars: Unicon;
  export const UilBell: Unicon;
  export const UilBill: Unicon;
  export const UilCalculator: Unicon;
  export const UilCalendar: Unicon;
  export const UilChartDown: Unicon;
  export const UilChartGrowth: Unicon;
  export const UilChartPie: Unicon;
  export const UilCheck: Unicon;
  export const UilClock: Unicon;
  export const UilCog: Unicon;
  export const UilCoins: Unicon;
  export const UilDownloadAlt: Unicon;
  export const UilEdit: Unicon;
  export const UilEnvelope: Unicon;
  export const UilEstate: Unicon;
  export const UilExchange: Unicon;
  export const UilExclamationTriangle: Unicon;
  export const UilEye: Unicon;
  export const UilEyeSlash: Unicon;
  export const UilLightbulbAlt: Unicon;
  export const UilLock: Unicon;
  export const UilMoon: Unicon;
  export const UilPalette: Unicon;
  export const UilPlus: Unicon;
  export const UilRepeat: Unicon;
  export const UilSearch: Unicon;
  export const UilSignout: Unicon;
  export const UilStar: Unicon;
  export const UilSun: Unicon;
  export const UilTimes: Unicon;
  export const UilTrashAlt: Unicon;
  export const UilTrophy: Unicon;
  export const UilUniversity: Unicon;
  export const UilWallet: Unicon;
}
