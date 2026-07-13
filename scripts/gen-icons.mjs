// Genera favicon + iconos PWA a partir del logo de marca en /Imagenes/Icon.png.
// Uso: node scripts/gen-icons.mjs   (requiere devDeps: sharp, png-to-ico)
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "Imagenes", "Icon.png");
const OUT = path.join(root, "public", "icons");
const CREAM = "#f4efe3";

await mkdir(OUT, { recursive: true });

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// 1) icon "any" — logo transparente tal cual
for (const size of [192, 512]) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: transparent })
    .png()
    .toFile(path.join(OUT, `icon-${size}.png`));
}

// Compone el logo centrado a `ratio` sobre fondo `bg` (sólido u opaco)
async function composed(size, ratio, bg, file) {
  const inner = Math.round(size * ratio);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: transparent })
    .png()
    .toBuffer();
  const pad = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toFile(path.join(OUT, file));
}

// 2) maskable (safe zone ~68%) sobre crema sólido
await composed(192, 0.68, CREAM, "icon-maskable-192.png");
await composed(512, 0.68, CREAM, "icon-maskable-512.png");

// 3) apple-touch-icon 180 (sin transparencia)
await composed(180, 0.72, CREAM, "apple-touch-icon.png");

// 4) favicon.ico (16/32/48) sobre crema
const icoBuffers = await Promise.all(
  [16, 32, 48].map(async (s) => {
    const inner = Math.round(s * 0.82);
    const logo = await sharp(SRC)
      .resize(inner, inner, { fit: "contain", background: transparent })
      .png()
      .toBuffer();
    const pad = Math.round((s - inner) / 2);
    return sharp({ create: { width: s, height: s, channels: 4, background: CREAM } })
      .composite([{ input: logo, top: pad, left: pad }])
      .png()
      .toBuffer();
  }),
);
await writeFile(path.join(root, "app", "favicon.ico"), await pngToIco(icoBuffers));

console.log("✓ Iconos generados en public/icons y app/favicon.ico");
