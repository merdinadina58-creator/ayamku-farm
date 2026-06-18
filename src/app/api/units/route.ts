import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Daftar satuan default yang akan di-seed otomatis saat tabel masih kosong.
const DEFAULT_UNITS = [
  'Sak',
  'Karung',
  'Liter',
  'kg',
  'gram',
  'Ekor',
  'Unit',
  'Pcs',
  'Botol',
  'Galur',
  'Pak',
  'Box',
  'Meter',
  'Roll',
  'Set',
]

/**
 * GET /api/units
 * Mengembalikan semua satuan. Jika tabel masih kosong, otomatis di-seed
 * dengan daftar satuan default agar dropdown selalu punya pilihan.
 */
export async function GET() {
  try {
    let units = await db.unit.findMany({ orderBy: { name: 'asc' } })

    // Auto-seed default units jika belum ada satupun.
    if (units.length === 0) {
      await db.unit.createMany({
        data: DEFAULT_UNITS.map((name) => ({ name })),
        skipDuplicates: true,
      })
      units = await db.unit.findMany({ orderBy: { name: 'asc' } })
    }

    return NextResponse.json(units)
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
}

/**
 * POST /api/units
 * Menambah satuan baru. Nama distandarisasi (trim + capitalize) dan
 * dicegah duplikasi berkat constraint @unique + dedup guard.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawName: string = (body?.name ?? '').toString().trim()

    if (!rawName) {
      return NextResponse.json({ error: 'Nama satuan wajib diisi' }, { status: 400 })
    }

    // Standarisasi: huruf pertama kapital, sisanya tetap.
    const name =
      rawName.charAt(0).toUpperCase() + rawName.slice(1)

    const unit = await withDedup(dedupKey('unit', { name }), async () => {
      // Cek apakah sudah ada (case-insensitive) — hindari duplikat.
      const existing = await db.unit.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      })
      if (existing) return existing

      try {
        return await db.unit.create({ data: { name } })
      } catch (err: unknown) {
        // Fallback: jika race condition lolos, ambil yang sudah ada.
        const again = await db.unit.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        })
        if (again) return again
        throw err
      }
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })
  }
}
