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

// GET /api/logo — serve logo image (uploaded custom logo or default SVG)
export async function GET() {
  try {
    const row = await db.appSetting.findUnique({ where: { key: 'logoData' } })
    if (row && row.value && row.value.startsWith('data:image/')) {
      // Parse data URL: data:image/png;base64,XXXX
      const match = row.value.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        const mime = match[1]
        const base64 = match[2]
        const buffer = Buffer.from(base64, 'base64')
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }
  } catch (e) {
    // fall through to default
  }
  return new NextResponse(DEFAULT_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
