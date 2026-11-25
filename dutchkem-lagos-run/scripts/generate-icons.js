/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Renders every PWA icon from the Dutchkem Ventures danfo mark.
 * Usage: npm run icons
 *
 * Outputs (client/icons/):
 *   icon-192.png            192×192, full bleed
 *   icon-512.png            512×512, full bleed
 *   icon-maskable-512.png   512×512, 20% safe-zone padding on every side
 *   apple-touch-icon.png    180×180, full bleed
 *
 * The mark is drawn with pure vectors — never <text> — because icon
 * generation must not depend on system fonts being installed.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'client', 'icons');

/* The mark is authored in a 512×512 coordinate box and rescaled into
 * whatever canvas size the icon needs, so every icon stays pixel-identical
 * in proportion. Extracted from the Lagos Run palette: danfo yellow on the
 * near-black page background.
 */
const MARK_SIZE = 512;
const BG = '#0d0d0d';
const YELLOW = '#FFC72C';

/* The danfo itself, in the 512×512 box: yellow body with black trim,
 * three black passenger windows, two black wheels.
 */
const BUS = `
    <rect x="40" y="190" width="432" height="156" rx="30" fill="#FFC72C" stroke="#0d0d0d" stroke-width="14"/>
    <rect x="78" y="212" width="112" height="64" rx="10" fill="#0d0d0d"/>
    <rect x="200" y="212" width="112" height="64" rx="10" fill="#0d0d0d"/>
    <rect x="322" y="212" width="112" height="64" rx="10" fill="#0d0d0d"/>
    <rect x="78" y="292" width="356" height="20" rx="10" fill="#0d0d0d"/>
    <circle cx="140" cy="352" r="48" fill="#0d0d0d" stroke="#FFC72C" stroke-width="10"/>
    <circle cx="140" cy="352" r="14" fill="#FFC72C"/>
    <circle cx="372" cy="352" r="48" fill="#0d0d0d" stroke="#FFC72C" stroke-width="10"/>
    <circle cx="372" cy="352" r="14" fill="#FFC72C"/>`;

/* logoSvg(size, { maskable })
 * Returns the complete SVG document for a `size`×`size` icon.
 * Maskable icons inset the artwork by 20% of the canvas on every side, so the
 * bus stays inside the launcher's safe zone no matter how the OS crops the icon.
 * The background is painted full bleed in both cases: a masked icon must never
 * show a transparent corner through the launcher's mask.
 */
function logoSvg(size, opts) {
  const maskable = !!(opts && opts.maskable);
  const padding = maskable ? Math.round(size * 0.2) : 0;
  const inner = size - padding * 2;
  const scale = inner / MARK_SIZE;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <g transform="translate(0 -22)">${BUS}
    </g>
  </g>
</svg>`;
}

/* render(size, filename, opts)
 * Writes one PNG with maximum deflate compression and reports its weight.
 */
async function render(size, filename, opts) {
  const outPath = path.join(OUT_DIR, filename);
  const svg = logoSvg(size, opts);

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const bytes = fs.statSync(outPath).size;
  const kb = (bytes / 1024).toFixed(1);
  const label = opts && opts.maskable ? 'maskable, 20% safe zone' : 'full bleed';

  console.log('[icons] ' + filename + ' — ' + size + '×' + size + ' (' + label + ') ' + kb + ' KB');
  return outPath;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await render(192, 'icon-192.png');
  await render(512, 'icon-512.png');
  await render(512, 'icon-maskable-512.png', { maskable: true });
  await render(180, 'apple-touch-icon.png');

  console.log('[icons] done — © 2026 Dutchkem Ventures. All rights reserved.');
})().catch((error) => {
  console.error('[icons] FAILED:', (error && error.message) || error);
  process.exit(1);
});
