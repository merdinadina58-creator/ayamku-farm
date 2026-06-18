import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/settings — return all app settings (appName, logoData)
export async function GET() {
  try {
    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return NextResponse.json({
      appName: settings.appName || 'AyamKu Farm',
      logoData: settings.logoData || '',
    })
  } catch (e) {
    return NextResponse.json({ appName: 'AyamKu Farm', logoData: '' })
  }
}

// POST /api/settings — upsert app settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const updates: { key: string; value: string }[] = []
    if (typeof body.appName === 'string' && body.appName.trim()) {
      updates.push({ key: 'appName', value: body.appName.trim().slice(0, 50) })
    }
    if (typeof body.logoData === 'string') {
      // Allow empty string to clear logo; otherwise validate data URL prefix
      if (body.logoData === '' || body.logoData.startsWith('data:image/')) {
        updates.push({ key: 'logoData', value: body.logoData })
      }
    }

    for (const u of updates) {
      await db.appSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    }

    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return NextResponse.json({
      appName: settings.appName || 'AyamKu Farm',
      logoData: settings.logoData || '',
      saved: updates.map((u) => u.key),
    })
  } catch (e) {
    console.error('Settings POST error:', e)
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 })
  }
}
