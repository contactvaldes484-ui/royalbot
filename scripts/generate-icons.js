const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePng(w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const c = Buffer.concat([t, data]);
    const crcVal = crc32(c);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, c, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // RGB color

  // Royal blue background (#2563eb = RGB 37, 99, 235)
  const raw = Buffer.alloc(h * (1 + w * 3));
  let pos = 0;
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0; // Filter: none
    for (let x = 0; x < w; x++) {
      raw[pos++] = 37;
      raw[pos++] = 99;
      raw[pos++] = 235;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const iconsDir = path.join(__dirname, '..', 'client', 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const s of sizes) {
  const p = path.join(iconsDir, `icon-${s}.png`);
  fs.writeFileSync(p, makePng(s, s));
  console.log(`Generated valid PNG: icon-${s}.png (${s}x${s})`);
}
console.log('All icons generated successfully!');
