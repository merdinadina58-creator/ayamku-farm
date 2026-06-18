import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/manifest — dynamic PWA manifest with custom app name + logo
// /api/logo always serves PNG (via sharp conversion), so we declare image/png here.
export async function GET() {
  let appName = 'AyamKu Farm'

  try {
    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    if (settings.appName) appName = settings.appName
  } catch {
    // use defaults
  }

  // /api/logo always converts to 512x512 PNG, so we always declare image/png.
  // This ensures browsers pick the icon correctly regardless of uploaded format.
  const manifest = {
    name: appName,
    short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
    description: 'Sistem Manajemen Peternakan Ayam',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#10b981',
    icons: [
      { src: '/api/logo', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/logo', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/logo', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/api/logo', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
