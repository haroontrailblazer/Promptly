import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const TABLE = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Grammarly-style mark, monochrome: a thick single-stroke "P" (black) on a
// white disc, anti-aliased via signed-distance rendering in a 24-unit space.
// Glyph path: stem (8,4)-(8,20); bowl top (8,4)-(13,4); bowl bottom
// (8,13)-(13,13); right semicircle centered (13,8.5) r 4.5. Stroke width 3.6.
const STROKE_R = 1.8;
const DISC_R = 11.6;

function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function glyphDist(px, py) {
  let d = segDist(px, py, 8, 4, 8, 20); // stem
  d = Math.min(d, segDist(px, py, 8, 4, 13, 4)); // bowl top
  d = Math.min(d, segDist(px, py, 8, 13, 13, 13)); // bowl bottom
  const dx = px - 13;
  const dy = py - 8.5;
  if (dx >= 0) d = Math.min(d, Math.abs(Math.hypot(dx, dy) - 4.5)); // bowl arc
  return d;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function png(size) {
  const rows = [];
  const aa = 24 / size; // one output pixel in glyph units
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 24;
      const v = ((y + 0.5) / size) * 24;
      const discCov = clamp01((DISC_R - Math.hypot(u - 12, v - 12)) / aa + 0.5);
      const glyphCov = clamp01((STROKE_R - glyphDist(u, v)) / aa + 0.5);
      const g = Math.round(255 * (1 - glyphCov)); // black glyph on white disc
      row.push(g, g, g, Math.round(255 * discCov));
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
mkdirSync('public/icons', { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(`public/icons/${s}.png`, png(s));
console.log('icons written to public/icons');
