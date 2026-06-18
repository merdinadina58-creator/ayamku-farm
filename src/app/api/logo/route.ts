import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Default SVG logo (emerald chicken farm themed) used when no custom logo uploaded
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g fill="#ffffff">
    <ellipse cx="256" cy="300" rx="120" ry="110"/>
    <circle cx="256" cy="170" r="62"/>
    <path d="M256 108 L240 78 L272 78 Z" fill="#f59e0b"/>
    <circle cx="240" cy="165" r="8" fill="#06281f"/>
    <circle cx="272" cy="165" r="8" fill="#06281f"/>
    <path d="M250 185 Q256 195 262 185" stroke="#06281f" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M180 360 L170 410 L195 395 Z"/>
    <path d="M332 360 L342 410 L317 395 Z"/>
  </g>
</svg>`

// GET /api/logo — serve logo image as PNG for best compatibility with favicon + PWA + Apple.
// Accepts any uploaded format (PNG/JPEG/WebP/SVG) and converts to 512x512 PNG using sharp.
// Falls back to serving the raw uploaded image if sharp is unavailable.
export async function GET() {
  // Try to use uploaded custom logo
  try {
    const row = await db.appSetting.findUnique({ where: { key: 'logoData' } })
    if (row && row.value && row.value.startsWith('data:image/')) {
      const match = row.value.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
      if (match) {
        const originalMime = match[1]
        const base64 = match[2]
        const inputBuffer = Buffer.from(base64, 'base64')

        // Try to convert to 512x512 PNG using sharp (best for PWA / Apple touch icon).
        // If sharp fails (e.g. system lib missing), fall back to serving the raw image.
        try {
          const sharp = (await import('sharp')).default
          const pngBuffer = await sharp(inputBuffer)
            .resize(512, 512, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
            .png()
            .toBuffer()

          return new NextResponse(pngBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          })
        } catch (sharpErr) {
          // sharp unavailable — serve the raw image in its original format
          console.error('Sharp conversion failed, serving raw image:', sharpErr)
          return new NextResponse(inputBuffer, {
            status: 200,
            headers: {
              'Content-Type': originalMime,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          })
        }
      }
    }
  } catch (e) {
    console.error('Logo DB error:', e)
  }

  // Default: serve the SVG (browsers accept SVG for favicons)
  return new NextResponse(DEFAULT_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
