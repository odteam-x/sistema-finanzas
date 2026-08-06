// Genera favicon + iconos PWA + imagen de Open Graph a partir del isotipo de
// marca: la CARTERA de /Imagenes/logo cachin.png.
// Uso: node scripts/gen-icons.mjs   (requiere devDeps: sharp, png-to-ico)
//
// El isotipo vigente es la cartera. No es el monograma: hubo una vez en que se
// tomó la fecha de archivo como señal de cuál era el logo actual y se
// sobreescribió el bueno con el viejo. La fecha no dice cuál es el vigente.
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "Imagenes", "logo cachin.png");
const OUT = path.join(root, "public", "icons");

// Fondo de las piezas con placa. Es --color-primary: índigo, ya no el teal
// #127478 de la marca anterior. Si la marca cambia, este valor cambia con ella
// y hay que volver a correr el script — los PNG no leen tokens CSS.
const PLATE = "#3A2E7E";

await mkdir(OUT, { recursive: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// El PNG de origen trae margen alrededor de la cartera. Se recorta una sola vez
// para que todas las piezas partan del mismo encuadre exacto.
const trimmed = await sharp(SRC).trim().png().toBuffer();

/** La cartera a `size`, en el color de marca y con fondo transparente.
 *
 *  El PNG de origen tiene la cartera en TEAL, que era la marca hasta la Fase
 *  26. Se recolorea aquí en vez de editar el archivo de origen: así el
 *  original se conserva intacto en Imagenes/ y volver atrás es cambiar una
 *  constante.
 *
 *  Se recolorea por MASCARA, no tocando los píxeles teal uno a uno: se toma la
 *  silueta (el canal alfa) y se rellena de índigo. Reemplazar por color
 *  dejaría un borde teal en los píxeles del antialias, que son mezcla de teal
 *  y transparente — un halo del color viejo alrededor de toda la figura. */
const mark = async (size) =>
  sharp({ create: { width: size, height: size, channels: 4, background: PLATE } })
    .composite([
      {
        input: await sharp(trimmed)
          .resize(size, size, { fit: "contain", background: transparent })
          .png()
          .toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

/** La misma silueta, pero en blanco sólido. Es la que va sobre la placa: la
 *  cartera a color sobre índigo se pierde, ya pasó una vez con el maskable
 *  teal sobre teal — invisible en el lanzador hasta que se miró renderizado. */
const markWhite = async (size) =>
  sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    // `dest-in` conserva el destino (el blanco) solo donde la fuente es opaca:
    // el resultado es la silueta de la cartera rellena de blanco.
    .composite([
      {
        input: await sharp(trimmed)
          .resize(size, size, { fit: "contain", background: transparent })
          .png()
          .toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

/** Compone una silueta centrada al `ratio` indicado sobre la placa opaca. */
async function plated(size, ratio, file) {
  const inner = Math.round(size * ratio);
  const logo = await markWhite(inner);
  const meta = await sharp(logo).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: PLATE } })
    .composite([
      {
        input: logo,
        top: Math.round((size - meta.height) / 2),
        left: Math.round((size - meta.width) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUT, file));
}

// 1) icon "any" y favicons PNG — cartera a color, fondo transparente. El
//    sistema pone el fondo que le toque (claro u oscuro) y la cartera se ve.
for (const size of [192, 512]) {
  await writeFile(path.join(OUT, `icon-${size}.png`), await mark(size));
}
for (const size of [16, 32, 48]) {
  await writeFile(path.join(OUT, `favicon-${size}.png`), await mark(size));
}

// 2) Marca suelta para la UI (splash, login): a color y en blanco.
await writeFile(path.join(OUT, "logo-mark.png"), await mark(128));
await writeFile(path.join(OUT, "logo-mark-white.png"), await markWhite(128));

// 3) maskable — el lanzador recorta a círculo o squircle, así que la silueta se
//    queda en el 55% central (la zona segura garantizada es el 80% del ancho,
//    pero al 55% ni el recorte más agresivo la toca).
await plated(192, 0.55, "icon-maskable-192.png");
await plated(512, 0.55, "icon-maskable-512.png");

// 4) apple-touch-icon — iOS no admite transparencia y redondea él mismo las
//    esquinas, así que no hace falta zona segura: 70%.
await plated(180, 0.7, "apple-touch-icon.png");

// 5) favicon.ico (16/32/48) — transparente, igual que los PNG.
await writeFile(
  path.join(root, "app", "favicon.ico"),
  await pngToIco(await Promise.all([16, 32, 48].map((s) => mark(s)))),
);

// 6) Imagen de Open Graph (1200x630) — SOLO para /login, la única ruta pública.
//    Las rutas privadas no llevan OG: nadie las comparte y el SEO de buscadores
//    no aplica detrás de un login.
const ogLogo = await markWhite(260);
const ogMeta = await sharp(ogLogo).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: PLATE } })
  .composite([
    { input: ogLogo, top: Math.round((630 - ogMeta.height) / 2), left: Math.round((1200 - ogMeta.width) / 2) },
  ])
  .png()
  .toFile(path.join(root, "public", "og.png"));

console.log("✓ Iconos generados en public/icons, app/favicon.ico y public/og.png");
