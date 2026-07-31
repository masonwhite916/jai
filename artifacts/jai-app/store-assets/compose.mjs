/**
 * Compose Play Store assets using only `sharp` (no canvas dep needed).
 * Gradient backgrounds and phone frames are expressed as inline SVG.
 */

import sharp from 'sharp';
import path  from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = __dirname;

// ── Feature graphic: crop 1024×1024 → 1024×500 ─────────────────────────────
async function cropFeatureGraphic() {
  const src  = path.join(BASE, 'feature-graphic.png');
  const dest = path.join(BASE, 'feature-graphic-1024x500.png');
  const meta = await sharp(src).metadata();
  const top  = Math.round((meta.height - 500) / 2);
  await sharp(src)
    .extract({ left: 0, top, width: 1024, height: 500 })
    .toFile(dest);
  console.log('✓ feature-graphic-1024x500.png');
}

// ── Phone-frame mockup at 1080×1920 ─────────────────────────────────────────
async function makeMockup(rawPath, outPath) {
  const W = 1080, H = 1920;
  const PW = 750, PH = 1500;
  const PX = (W - PW) / 2;  // 165
  const PY = (H - PH) / 2;  // 210
  const R  = 52;             // phone corner radius

  // 1. Purple-gradient background as SVG → PNG buffer
  const bgSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0D0B1F"/>
      <stop offset="50%"  stop-color="#1A0F3C"/>
      <stop offset="100%" stop-color="#2D1B69"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="13%" r="45%">
      <stop offset="0%"   stop-color="#7B3FDB" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#0D0B1F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
</svg>`;

  const bgBuf = await sharp(Buffer.from(bgSvg))
    .png()
    .toBuffer();

  // 2. Scale screenshot to phone area
  const ssBuf = await sharp(rawPath)
    .resize(PW, PH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // 3. Phone frame + notch as SVG overlay
  const frameSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- phone bezel outline -->
  <rect x="${PX - 5}" y="${PY - 5}"
        width="${PW + 10}" height="${PH + 10}"
        rx="${R}" ry="${R}"
        fill="none"
        stroke="rgba(255,255,255,0.20)"
        stroke-width="10"/>
  <!-- notch pill -->
  <rect x="${W/2 - 70}" y="${PY + 14}"
        width="140" height="28"
        rx="14" ry="14"
        fill="rgba(255,255,255,0.18)"/>
  <!-- home indicator bar -->
  <rect x="${W/2 - 60}" y="${PY + PH - 28}"
        width="120" height="8"
        rx="4" ry="4"
        fill="rgba(255,255,255,0.35)"/>
</svg>`;

  const frameBuf = await sharp(Buffer.from(frameSvg))
    .png()
    .toBuffer();

  // 4. Composite: bg → screenshot → frame
  await sharp(bgBuf)
    .composite([
      { input: ssBuf,   left: Math.round(PX), top: Math.round(PY) },
      { input: frameBuf },
    ])
    .toFile(outPath);

  console.log(`✓ ${path.basename(outPath)}`);
}

async function main() {
  await cropFeatureGraphic();

  const screens = [
    { raw: 'raw/screen-home.jpg',       out: 'screenshot-1-onboarding.png' },
    { raw: 'raw/screen-services.jpg',   out: 'screenshot-2-services.png'   },
    { raw: 'raw/screen-membership.jpg', out: 'screenshot-3-membership.png' },
    { raw: 'raw/screen-emergency.jpg',  out: 'screenshot-4-emergency.png'  },
  ];

  await Promise.all(
    screens.map(s =>
      makeMockup(
        path.join(BASE, s.raw),
        path.join(BASE, s.out),
      )
    )
  );

  console.log('\nAll Play Store assets ready → artifacts/jai-app/store-assets/');
}

main().catch(err => { console.error(err); process.exit(1); });
