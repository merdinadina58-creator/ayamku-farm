import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/manifest — dynamic PWA manifest with custom app name + logo
// Detects actual image MIME type from stored logoData so JPEG/PNG/WebP all work.
export async function GET() {
  let appName = 'AyamKu Farm'
  let logoMime = 'image/png' // default for the SVG fallback (browsers accept png type for svg too)

  try {
    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    if (settings.appName) appName = settings.appName

    // Detect actual MIME type from the stored data URL
    if (settings.logoData && settings.logoData.startsWith('data:image/')) {
      const match = settings.logoData.match(/^data:(image\/[a-zA-Z+]+);/)
      if (match) {
        logoMime = match[1]
      }
    }
  } catch {
    // use defaults
  }

  // SVG is served as image/svg+xml by /api/logo when no custom logo exists.
  // For PWA icons, SVG works in modern browsers but maskable purpose needs raster.
  // We declare multiple sizes with the actual MIME type so the browser picks the right icon.
  const isSvg = logoMime === 'image/svg+xml'

  const icons = isSvg
    ? [
        { src: '/api/logo', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ]
    : [
        // Raster (PNG/JPEG/WebP) — declare common sizes, browser will scale
        { src: '/api/logo', sizes: '192x192', type: logoMime, purpose: 'any' },
        { src: '/api/logo', sizes: '512x512', type: logoMime, purpose: 'any' },
        { src: '/api/logo', sizes: '192x192', type: logoMime, purpose: 'maskable' },
        { src: '/api/logo', sizes: '512x512', type: logoMime, purpose: 'maskable' },
      ]

  const manifest = {
    name: appName,
    short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
    description: 'Sistem Manajemen Peternakan Ayam',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#10b981',
    icons,
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
