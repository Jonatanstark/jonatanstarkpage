// Generates favicon.png — no npm packages required
// Run: node generate-favicon.js

const fs   = require('fs');
const zlib = require('zlib');

const SIZE = 64;
// RGBA pixel buffer, default black
const px = new Uint8Array(SIZE * SIZE * 4); // all zeros = transparent

function set(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
}

function fillRect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0+h; y++)
    for (let x = x0; x < x0+w; x++)
      set(x, y, r, g, b);
}

// Anti-aliased circle stroke
function strokeCircle(cx, cy, radius, thickness, r, g, b) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const d = Math.abs(dist - radius);
      if (d < thickness / 2 + 1) {
        const alpha = Math.max(0, 1 - Math.max(0, d - thickness/2));
        const a = Math.round(alpha * 255);
        const idx = (y * SIZE + x) * 4;
        // Blend over existing
        const oa = px[idx+3] / 255;
        const na = a / 255;
        const out = na + oa * (1 - na);
        if (out > 0) {
          px[idx]   = Math.round((r * na + px[idx]   * oa * (1-na)) / out);
          px[idx+1] = Math.round((g * na + px[idx+1] * oa * (1-na)) / out);
          px[idx+2] = Math.round((b * na + px[idx+2] * oa * (1-na)) / out);
          px[idx+3] = Math.round(out * 255);
        }
      }
    }
  }
}

// Anti-aliased line
function strokeLine(x0, y0, x1, y1, thickness, r, g, b) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy/len, ny = dx/len; // normal

  // Scan bounding box
  const minX = Math.max(0, Math.floor(Math.min(x0,x1) - thickness) );
  const maxX = Math.min(SIZE-1, Math.ceil(Math.max(x0,x1) + thickness));
  const minY = Math.max(0, Math.floor(Math.min(y0,y1) - thickness));
  const maxY = Math.min(SIZE-1, Math.ceil(Math.max(y0,y1) + thickness));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Project point onto line
      const t = ((x-x0)*dx + (y-y0)*dy) / (len*len);
      if (t < 0 || t > 1) continue;
      const px2 = x0 + t*dx, py2 = y0 + t*dy;
      const dist = Math.sqrt((x-px2)**2 + (y-py2)**2);
      const d = dist - thickness/2;
      if (d < 1) {
        const alpha = Math.max(0, 1 - Math.max(0, d));
        const a = Math.round(alpha * 255);
        const idx = (y * SIZE + x) * 4;
        const oa = px[idx+3] / 255;
        const na = a / 255;
        const out = na + oa * (1 - na);
        if (out > 0) {
          px[idx]   = Math.round((r * na + px[idx]   * oa * (1-na)) / out);
          px[idx+1] = Math.round((g * na + px[idx+1] * oa * (1-na)) / out);
          px[idx+2] = Math.round((b * na + px[idx+2] * oa * (1-na)) / out);
          px[idx+3] = Math.round(out * 255);
        }
      }
    }
  }
}

// Simple bitmap font glyphs (7-wide x 9-tall pixel bitmaps)
const GLYPHS = {
  J: [
    '  XXX  ',
    '  XXX  ',
    '   X   ',
    '   X   ',
    '   X   ',
    '   X   ',
    'X  X   ',
    'XX X   ',
    ' XXX   ',
  ],
  S: [
    ' XXX ',
    'X   X',
    'X    ',
    ' XXX ',
    '    X',
    'X   X',
    ' XXX ',
  ],
};

function drawGlyph(char, originX, originY, scale, r, g, b) {
  const rows = GLYPHS[char];
  rows.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch === 'X') {
        const x0 = originX + rx * scale;
        const y0 = originY + ry * scale;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            set(x0+dx, y0+dy, r, g, b);
      }
    });
  });
}

// ── Draw ──
const C = 184; // gray value #b8b8b8

// Black background
fillRect(0, 0, SIZE, SIZE, 0, 0, 0);

// Circle: center (27,32), radius 20
strokeCircle(27, 32, 20, 3.5, C, C, C);

// Diagonal slash
strokeLine(11, 52, 43, 10, 2.5, C, C, C);

// Large J: scale 4 → 7*4=28px wide, 9*4=36px tall, center around (27,32)
drawGlyph('J', 10, 14, 4, C, C, C);

// Small S: scale 2 → 5*2=10px wide, 7*2=14px tall
drawGlyph('S', 47, 27, 2, C, C, C);

// ── Encode PNG ──
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// Raw image data: filter byte 0 per row + RGBA pixels
const raw = [];
for (let y = 0; y < SIZE; y++) {
  raw.push(0); // filter none
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    raw.push(px[i], px[i+1], px[i+2], px[i+3]);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8]  = 8;  // bit depth
ihdr[9]  = 6;  // RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const idat = zlib.deflateSync(Buffer.from(raw));

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync('favicon.png', png);
console.log('favicon.png written (' + SIZE + 'x' + SIZE + ')');
