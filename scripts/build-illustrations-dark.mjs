// Genera las variantes de modo oscuro de las ilustraciones (unDraw) a partir
// de las claras: public/illustrations/<n>.svg -> <n>.dark.svg
//
// Por qué un script y no CSS: las ilustraciones se cargan como imagen, no
// inline, así que las variables CSS de la página NO las alcanzan. Y no basta
// con "oscurecer": el arte de unDraw depende del contraste entre las formas
// claras (objetos) y las oscuras (contornos, pelo, ropa). Sobre una tarjeta
// oscura, tal cual, los grises casi blancos se leen como manchas brillantes y
// los contornos casi negros desaparecen. Lo que hace este mapa es INVERTIR la
// luminancia de los neutros conservando su orden relativo, y dejar el acento
// teal y los tonos de piel reconocibles.
//
// Uso: node scripts/build-illustrations-dark.mjs
// Correr de nuevo si se agrega o reemplaza una ilustración.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "public", "illustrations");
const MANIFEST = join(process.cwd(), "components", "ui", "illustrations.generated.ts");

// Orden de luminancia conservado: #fff era lo más claro y pasa a ser lo más
// oscuro; #2f2e41 era lo más oscuro y pasa a ser lo más claro.
const MAP = {
  "#fff": "#2b3a35",
  "#ffffff": "#2b3a35",
  "#f2f2f2": "#31423c",
  "#f0f0f0": "#31423c",
  "#e6e6e6": "#384b44",
  "#cacaca": "#475c54",
  "#ccc": "#475c54",
  "#cccccc": "#475c54",
  "#3f3d56": "#9db1a9",
  "#2f2e41": "#ccdad4",
  // Acento de marca: el teal más luminoso que ya usa el modo oscuro para
  // texto sobre superficie (--color-primary-fg).
  "#127478": "#25a8ac",
  // Piel: se mantiene reconocible, solo baja el brillo para no destacar por
  // encima del acento.
  "#ffb8b8": "#dfa2a2",
  "#ffb6b6": "#dfa2a2",
  "#a0616a": "#8e555d",
  "#9f616a": "#8e555d",
};

const sources = readdirSync(DIR).filter((f) => f.endsWith(".svg") && !f.endsWith(".dark.svg"));

let sinMapear = new Set();
const ratios = [];

for (const file of sources) {
  const svg = readFileSync(join(DIR, file), "utf8");

  const out = svg.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,8})"/g, (full, attr, color) => {
    const key = color.toLowerCase();
    if (key === "#none") return full;
    const next = MAP[key];
    if (!next) {
      sinMapear.add(key);
      return full;
    }
    return `${attr}="${next}"`;
  });

  writeFileSync(join(DIR, file.replace(/\.svg$/, ".dark.svg")), out);

  // La proporción sale del viewBox, no se escribe a mano: si se reemplaza una
  // ilustración por otra de otra forma, el componente se entera al regenerar.
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  if (!vb) throw new Error(`${file} no tiene viewBox — el componente no puede reservar su espacio.`);
  // viewBox = "minX minY ancho alto": interesan los dos últimos.
  const [, , w, h] = vb[1].trim().split(/\s+/).map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) {
    throw new Error(`${file}: viewBox ilegible ("${vb[1]}")`);
  }
  ratios.push([file.replace(/\.svg$/, ""), Number((w / h).toFixed(4))]);

  console.log(`  ${file} -> ${file.replace(/\.svg$/, ".dark.svg")}  (ratio ${(w / h).toFixed(2)})`);
}

ratios.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(
  MANIFEST,
  `// GENERADO por scripts/build-illustrations-dark.mjs — no editar a mano.
// Proporción (ancho/alto) de cada ilustración, leída de su viewBox. El
// componente la necesita para reservar el espacio exacto antes de que cargue
// la imagen y no provocar un salto de layout.

export const ILLUSTRATION_RATIOS = {
${ratios.map(([n, r]) => `  ${JSON.stringify(n)}: ${r},`).join("\n")}
} as const;

export type IllustrationName = keyof typeof ILLUSTRATION_RATIOS;
`,
);

console.log(`\n${sources.length} ilustraciones procesadas. Manifiesto: ${MANIFEST}`);
if (sinMapear.size > 0) {
  console.log(
    `\nAVISO: colores sin equivalente oscuro (se dejaron igual): ${[...sinMapear].join(", ")}`,
  );
  console.log("Agrégalos a MAP en este script si se ven mal sobre la tarjeta oscura.");
  process.exitCode = 1;
}
