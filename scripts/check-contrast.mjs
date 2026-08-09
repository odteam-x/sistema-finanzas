// Auditoría de contraste WCAG AA sobre los tokens de app/globals.css.
//
// POR QUÉ EXISTE. Esta comprobación se rehizo a mano varias veces durante las
// Fases 26 y 27, y cada vez cubría un juego de pares distinto — así se coló el
// fallo de `text-danger` sobre `bg-tint-danger` (4.20:1), que es el patrón de
// Badge y estaba en pantalla desde hacía fases. Una lista escrita no se olvida
// de un par entre una sesión y otra.
//
// Lee los valores del CSS, no una copia: si alguien cambia un token y no corre
// esto, `npm run check:contrast` lo dice.
//
// LO QUE NO CUBRE: los colores que un componente compone en el marcado sin
// pasar por un token, y el texto sobre imágenes. Para eso hay que mirar la
// pantalla renderizada.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(root, "app", "globals.css"), "utf8");
const lineas = css.split(/\r?\n/);

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

/** Los tokens de un bloque, por número de línea: `@theme` es el modo claro y
 *  `[data-mode="dark"]` solo redefine los que cambian. */
function bloque(selector) {
  const i = lineas.findIndex((l) => l.trim().startsWith(selector));
  if (i === -1) throw new Error(`No se encontró el bloque ${selector}`);
  let j = i;
  while (j < lineas.length && lineas[j] !== "}") j++;
  const o = {};
  for (const m of lineas
    .slice(i, j)
    .join("\n")
    .matchAll(/(--color-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g))
    o[m[1]] = m[2];
  return o;
}

const claro = bloque("@theme");
const oscuro = { ...claro, ...bloque('[data-mode="dark"]') };

let fallos = 0;
let medidos = 0;

function comprobar(modo, etiqueta, fg, bg, minimo) {
  if (!fg || !bg) return;
  medidos++;
  const r = ratio(fg, bg);
  if (r < minimo) {
    fallos++;
    console.error(
      `  FALLA ${r.toFixed(2)}  ${modo}  ${etiqueta}  (${fg} sobre ${bg}, mínimo ${minimo})`,
    );
  }
}

const SUPERFICIES = [
  "surface",
  "surface-raised",
  "surface-sunken",
  "surface-nav",
  "surface-modal",
  "surface-sheet",
  "bg",
];
const SEMANTICOS = ["danger", "warning", "income", "expense", "info", "achievement"];

for (const [modo, T] of [
  ["claro ", claro],
  ["oscuro", oscuro],
]) {
  for (const s of SUPERFICIES) {
    comprobar(modo, `ink sobre ${s}`, T["--color-ink"], T[`--color-${s}`], 4.5);
    comprobar(modo, `muted sobre ${s}`, T["--color-muted"], T[`--color-${s}`], 4.5);
  }

  const base = T["--color-surface"];
  for (const k of [...SEMANTICOS, "primary-fg", "success"])
    comprobar(modo, `${k} sobre surface`, T[`--color-${k}`], base, 4.5);

  comprobar(
    modo,
    "primary-fg sobre primary-soft",
    T["--color-primary-fg"],
    T["--color-primary-soft"],
    4.5,
  );

  // Texto secundario sobre cada tinte sólido.
  for (const k of ["brand", ...SEMANTICOS, "neutral"])
    comprobar(modo, `on-tint sobre tint-${k}`, T["--color-on-tint"], T[`--color-tint-${k}`], 4.5);

  // CADA SEMÁNTICO SOBRE SU PROPIO TINTE. Es lo que hace Badge
  // (bg-tint-danger + text-danger) y es el par más exigente de todos — el que
  // se escapó hasta que se miró la pantalla renderizada.
  for (const k of SEMANTICOS)
    comprobar(modo, `${k} sobre tint-${k}`, T[`--color-${k}`], T[`--color-tint-${k}`], 4.5);

  // Y sobre su versión -soft, que usan los avisos.
  for (const k of ["danger", "warning", "success", "info", "achievement"])
    comprobar(modo, `${k} sobre ${k}-soft`, T[`--color-${k}`], T[`--color-${k}-soft`], 4.5);

  // Los DOS extremos del gradiente de marca: blanco y el label secundario.
  for (const e of ["primary-grad-start", "primary-grad-end"]) {
    comprobar(modo, `blanco sobre ${e}`, T["--color-on-brand"], T[`--color-${e}`], 4.5);
    comprobar(modo, `label sobre ${e}`, T["--color-on-brand-muted"], T[`--color-${e}`], 4.5);
  }

  // `primary` como RELLENO: lleva blanco encima y tiene que distinguirse de la
  // superficie. Son dos exigencias a la vez, y en oscuro solo hay una ventana
  // estrecha que cumple las dos.
  comprobar(modo, "blanco sobre primary (relleno)", "#FFFFFF", T["--color-primary"], 4.5);
  comprobar(modo, "primary contra surface", T["--color-primary"], base, 3);
}

// Los cinco tonos de sección: lo que manda no es el blanco sino el label.
for (const m of css.matchAll(/\.tone-([a-z]+) \{([^}]+)\}/g)) {
  const o = {};
  for (const v of m[2].matchAll(/(--color-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) o[v[1]] = v[2];
  for (const e of ["--color-primary-grad-start", "--color-primary-grad-end"]) {
    const punto = e.includes("start") ? "inicio" : "final";
    comprobar("tono  ", `blanco sobre ${m[1]} ${punto}`, "#FFFFFF", o[e], 4.5);
    comprobar("tono  ", `label sobre ${m[1]} ${punto}`, o["--color-on-brand-muted"], o[e], 4.5);
  }
  comprobar("tono  ", `blanco sobre el pozo de ${m[1]}`, "#FFFFFF", o["--color-on-brand-well"], 4.5);
}

if (fallos > 0) {
  console.error(`\n${medidos} pares medidos. ${fallos} FALLAN AA.`);
  process.exit(1);
}
console.log(`${medidos} pares medidos en claro, oscuro y los cinco tonos. Todos cumplen AA.`);
