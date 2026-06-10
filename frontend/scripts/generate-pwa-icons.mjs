// Generates the PWA / home-screen icon set from the brand mark (a green rounded
// square with a white "T"). Run with `node scripts/generate-pwa-icons.mjs`.
//
// The "T" is drawn as plain rectangles (not an SVG <text> element) on purpose:
// sharp/libvips rasterizes SVG text only when the font resolves through
// fontconfig, which is not guaranteed on every machine/CI. Rectangles render the
// same everywhere and stay crisp at any size.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BRAND = '#12A751'
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// Build the mark as an SVG string. `mode` is either:
//   'rounded'  — brand rounded square, large T (the "any" purpose icons + favicons)
//   'full'     — full-bleed green, smaller T inside the maskable safe zone
//                (Android adaptive masks + the iOS apple-touch-icon, which iOS rounds itself)
function svg(size, mode) {
  const s = size
  const isFull = mode === 'full'
  const rx = isFull ? 0 : Math.round(s * 0.22)
  // T geometry as fractions of the canvas; smaller for 'full' so it stays within
  // the inner ~80% safe area that Android's maskable crop can reach.
  const g = isFull
    ? { barX: 0.28, barW: 0.44, barY: 0.31, barH: 0.1, stemW: 0.1, stemBottom: 0.66 }
    : { barX: 0.18, barW: 0.64, barY: 0.25, barH: 0.13, stemW: 0.14, stemBottom: 0.73 }
  const barX = s * g.barX
  const barW = s * g.barW
  const barY = s * g.barY
  const barH = s * g.barH
  const stemW = s * g.stemW
  const stemX = (s - stemW) / 2
  const stemBottom = s * g.stemBottom
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
      `<rect width="${s}" height="${s}" rx="${rx}" fill="${BRAND}"/>` +
      `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="#fff"/>` +
      `<rect x="${stemX}" y="${barY}" width="${stemW}" height="${stemBottom - barY}" fill="#fff"/>` +
    `</svg>`,
  )
}

const targets = [
  { file: 'pwa-64x64.png', size: 64, mode: 'rounded' },
  { file: 'pwa-192x192.png', size: 192, mode: 'rounded' },
  { file: 'pwa-512x512.png', size: 512, mode: 'rounded' },
  { file: 'maskable-icon-512x512.png', size: 512, mode: 'full' },
  { file: 'apple-touch-icon-180x180.png', size: 180, mode: 'full' },
]

await Promise.all(
  targets.map(({ file, size, mode }) =>
    sharp(svg(size, mode)).png().toFile(join(outDir, file)).then(() => console.log('✓', file)),
  ),
)