// Genera iconos PNG del PWA sin dependencias externas.
// Diseño: fondo verde + tarjeta (wallet) blanca + moneda de acento.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function roundRect(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  if (dx <= 0 || dy <= 0) {
    return Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfH;
  }
  return dx * dx + dy * dy <= radius * radius;
}

function makePNG(size) {
  const green = [46, 125, 91];
  const greenDark = [31, 85, 64];
  const white = [244, 239, 227];
  const accent = [63, 165, 118];

  const cx = size / 2;
  const cardHalfW = size * 0.3;
  const cardHalfH = size * 0.21;
  const cardCy = size * 0.52;
  const radius = size * 0.07;
  const coinCx = cx + cardHalfW * 0.45;
  const coinCy = cardCy;
  const coinR = size * 0.06;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro
    for (let x = 0; x < size; x++) {
      let col = green;
      // degradado sutil vertical
      const t = y / size;
      col = [
        Math.round(green[0] * (1 - t) + greenDark[0] * t),
        Math.round(green[1] * (1 - t) + greenDark[1] * t),
        Math.round(green[2] * (1 - t) + greenDark[2] * t),
      ];
      if (roundRect(x, y, cx, cardCy, cardHalfW, cardHalfH, radius)) col = white;
      const cd = Math.hypot(x - coinCx, y - coinCy);
      if (cd <= coinR) col = accent;
      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makePNG(size));
  console.log(`icon-${size}.png generado`);
}
