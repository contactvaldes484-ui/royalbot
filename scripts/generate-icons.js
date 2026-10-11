/**
 * PWA Icon Generator
 * Generates all required PNG icons for the UltimateBot PWA
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../client/public/icons');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Minimal valid 1x1 transparent PNG (base64)
// We embed a blue-gradient SVG inside a PNG data URL using jimp if available,
// otherwise we copy a minimal PNG stub.

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function tryWithJimp() {
  try {
    const Jimp = require('jimp');
    return Jimp;
  } catch (_) {
    return null;
  }
}

async function generateWithJimp(Jimp) {
  for (const size of SIZES) {
    const image = new Jimp(size, size, 0x3b82f6ff);

    // Draw a rounded feel by darkening corners
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dist = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2));
        const radius = size * 0.45;
        if (dist > radius) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
    }

    const outPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await image.writeAsync(outPath);
    console.log(`✅ icon-${size}.png`);
  }
}

function generateMinimalPNG(size) {
  // Write a minimal valid PNG with a blue background
  // Using raw PNG structure
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#7c3aed');

  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

async function main() {
  console.log('🎨 Generating PWA icons...\n');

  // Try canvas first (best quality)
  try {
    const { createCanvas } = require('canvas');
    for (const size of SIZES) {
      const buf = generateMinimalPNG(size);
      fs.writeFileSync(path.join(OUTPUT_DIR, `icon-${size}.png`), buf);
      console.log(`✅ icon-${size}.png (canvas)`);
    }
    console.log('\n✅ All icons generated successfully!');
    return;
  } catch (_) {}

  // Try jimp (pure JS fallback)
  const Jimp = tryWithJimp();
  if (Jimp) {
    await generateWithJimp(Jimp);
    console.log('\n✅ All icons generated successfully (jimp)!');
    return;
  }

  // Fallback: copy SVG as PNG placeholder
  console.warn('⚠️  canvas and jimp not found. Copying SVG as placeholder.');
  console.warn('Install with: npm install canvas  (or)  npm install jimp');
  const svgPath = path.join(OUTPUT_DIR, 'icon-192.svg');
  if (fs.existsSync(svgPath)) {
    for (const size of SIZES) {
      fs.copyFileSync(svgPath, path.join(OUTPUT_DIR, `icon-${size}.png`));
    }
    console.log('📋 SVG copied as PNG placeholders. Replace with real PNGs before production.');
  }
}

main().catch(console.error);
