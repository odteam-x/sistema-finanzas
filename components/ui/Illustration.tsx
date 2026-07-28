import { cn } from "@/lib/cn";

export type IllustrationName =
  | "savings"
  | "make-it-rain"
  | "wallet"
  | "goals"
  | "target"
  | "receipt"
  | "subscriptions"
  | "data-reports"
  | "preferences"
  | "calculator"
  | "finance";

/** Dibujos de línea propios, no un pack de terceros.
 *
 *  Antes eran ilustraciones de unDraw cargadas como <img>. Como una imagen no
 *  ve las variables CSS de la página, el color iba horneado en el archivo y
 *  hacía falta una segunda copia `.dark.svg` por cada una, generada por un
 *  script, más un manifiesto de proporciones. Al ir en línea en el DOM, estos
 *  toman los tokens directamente: un solo dibujo sirve para los dos temas y
 *  se recolorea solo si mañana cambia la paleta.
 *
 *  Todos comparten la misma rejilla (120×96), el mismo grosor de trazo y dos
 *  únicos colores —marca y línea— para que se lean como una familia y no como
 *  once dibujos sueltos. */
const ART: Record<IllustrationName, React.ReactNode> = {
  // Monedas apiladas
  savings: (
    <>
      <ellipse cx="60" cy="32" rx="26" ry="8" className="ill-line" />
      <path d="M34 32v13c0 4.4 11.6 8 26 8s26-3.6 26-8V32" className="ill-line" />
      <path d="M34 45v13c0 4.4 11.6 8 26 8s26-3.6 26-8V45" className="ill-soft" />
      <path d="M34 58v6c0 4.4 11.6 8 26 8s26-3.6 26-8v-6" className="ill-soft" />
    </>
  ),
  // Monedas cayendo
  "make-it-rain": (
    <>
      <circle cx="44" cy="34" r="11" className="ill-line" />
      <circle cx="76" cy="52" r="11" className="ill-soft" />
      <circle cx="52" cy="70" r="8" className="ill-line" />
      <path d="M44 14v6M76 30v6M52 54v5" className="ill-soft" />
    </>
  ),
  // Cartera con tarjeta asomando
  wallet: (
    <>
      <rect x="24" y="28" width="72" height="44" rx="9" className="ill-line" />
      <path d="M24 42h72" className="ill-line" />
      <path d="M70 57h18" className="ill-soft" />
      <path d="M38 28V20a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v8" className="ill-soft" />
    </>
  ),
  // Bandera de meta
  goals: (
    <>
      <path d="M42 78V20" className="ill-line" />
      <path d="M42 24h32l-8 9 8 9H42" className="ill-line" />
      <path d="M28 78h48" className="ill-soft" />
      <circle cx="42" cy="20" r="3" className="ill-line" />
    </>
  ),
  // Diana con flecha
  target: (
    <>
      <circle cx="54" cy="54" r="26" className="ill-line" />
      <circle cx="54" cy="54" r="15" className="ill-soft" />
      <circle cx="54" cy="54" r="4" className="ill-fill" />
      <path d="M72 36l20-20" className="ill-line" />
      <path d="M80 16h12v12" className="ill-line" />
    </>
  ),
  // Recibo
  receipt: (
    <>
      <path
        d="M38 16h44v64l-7.3-5-7.4 5-7.3-5-7.3 5-7.4-5-7.3 5z"
        className="ill-line"
      />
      <path d="M50 34h20M50 46h20M50 58h12" className="ill-soft" />
    </>
  ),
  // Cargo recurrente
  subscriptions: (
    <>
      <rect x="30" y="34" width="60" height="38" rx="7" className="ill-line" />
      <path d="M30 46h60" className="ill-line" />
      <path d="M42 60h14" className="ill-soft" />
      <path d="M44 22a20 20 0 0 1 32 0" className="ill-soft" />
      <path d="M76 12v10H66" className="ill-soft" />
    </>
  ),
  // Barras de reporte
  "data-reports": (
    <>
      <path d="M26 78h68" className="ill-soft" />
      <rect x="36" y="50" width="13" height="28" rx="3" className="ill-soft" />
      <rect x="55" y="34" width="13" height="44" rx="3" className="ill-line" />
      <rect x="74" y="44" width="13" height="34" rx="3" className="ill-soft" />
    </>
  ),
  // Controles / ajustes
  preferences: (
    <>
      <path d="M28 32h64M28 52h64M28 72h64" className="ill-soft" />
      <circle cx="52" cy="32" r="7" className="ill-line" />
      <circle cx="74" cy="52" r="7" className="ill-line" />
      <circle cx="44" cy="72" r="7" className="ill-line" />
    </>
  ),
  // Calculadora
  calculator: (
    <>
      <rect x="34" y="14" width="52" height="68" rx="9" className="ill-line" />
      <rect x="44" y="24" width="32" height="13" rx="3" className="ill-soft" />
      <circle cx="48" cy="50" r="3" className="ill-fill" />
      <circle cx="60" cy="50" r="3" className="ill-fill" />
      <circle cx="72" cy="50" r="3" className="ill-fill" />
      <circle cx="48" cy="64" r="3" className="ill-fill" />
      <circle cx="60" cy="64" r="3" className="ill-fill" />
      <circle cx="72" cy="64" r="3" className="ill-fill" />
    </>
  ),
  // Tendencia al alza
  finance: (
    <>
      <path d="M26 76h68" className="ill-soft" />
      <path d="M34 64l17-16 12 10 21-26" className="ill-line" />
      <path d="M72 32h12v12" className="ill-line" />
      <circle cx="51" cy="48" r="3" className="ill-fill" />
      <circle cx="63" cy="58" r="3" className="ill-fill" />
    </>
  ),
};

interface IllustrationProps {
  name: IllustrationName;
  /** Ancho en px; el alto sale de la proporción fija 120×96. */
  width?: number;
  className?: string;
}

export function Illustration({ name, width = 150, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      width={width}
      height={(width * 96) / 120}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("illustration select-none", className)}
    >
      {ART[name]}
    </svg>
  );
}
