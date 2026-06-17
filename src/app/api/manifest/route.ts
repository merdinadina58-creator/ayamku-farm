import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/manifest — dynamic PWA manifest with custom app name + logo
export async function GET() {
  let appName = 'AyamKu Farm'
  try {
    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    if (settings.appName) appName = settings.appName
  } catch (e) {
    // use default
  }

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
      { src: '/api/logo', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/api/logo', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
