// GENERADO por scripts/build-illustrations-dark.mjs — no editar a mano.
// Proporción (ancho/alto) de cada ilustración, leída de su viewBox. El
// componente la necesita para reservar el espacio exacto antes de que cargue
// la imagen y no provocar un salto de layout.

export const ILLUSTRATION_RATIOS = {
  "calculator": 1.2564,
  "data-reports": 1.5272,
  "finance": 1.6661,
  "goals": 1.1979,
  "make-it-rain": 1.3288,
  "preferences": 1.4632,
  "receipt": 1.1177,
  "savings": 1.2403,
  "subscriptions": 1.4567,
  "target": 0.9926,
  "wallet": 0.4531,
} as const;

export type IllustrationName = keyof typeof ILLUSTRATION_RATIOS;
