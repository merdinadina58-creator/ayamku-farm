import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Daftar kategori default yang akan di-seed otomatis saat tabel masih kosong.
const DEFAULT_CATEGORIES = [
  'Kandang & Infrastruktur',
  'Peralatan Pakan & Minum',
  'Pemanas & Ventilasi',
  'Kebersihan & Sanitasi',
  'Alat Timbang & Ukur',
  'Alat Kesehatan',
  'Lainnya',
]

/**
 * GET /api/categories
 * Mengembalikan semua kategori. Jika tabel masih kosong, otomatis di-seed
 * dengan daftar kategori default agar dropdown selalu punya pilihan.
 */
export async function GET() {
  try {
    let categories = await db.category.findMany({ orderBy: { name: 'asc' } })

    // Auto-seed default categories jika belum ada satupun.
    if (categories.length === 0) {
      await db.category.createMany({
        data: DEFAULT_CATEGORIES.map((name) => ({ name })),
        skipDuplicates: true,
      })
      categories = await db.category.findMany({ orderBy: { name: 'asc' } })
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

/**
 * POST /api/categories
 * Menambah kategori baru. Nama distandarisasi (trim + capitalize) dan
 * dicegah duplikasi berkat constraint @unique + dedup guard.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawName: string = (body?.name ?? '').toString().trim()

    if (!rawName) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })
    }

    // Standarisasi: huruf pertama kapital, sisanya tetap.
    const name =
      rawName.charAt(0).toUpperCase() + rawName.slice(1)

    const category = await withDedup(dedupKey('category', { name }), async () => {
      // Cek apakah sudah ada (case-insensitive) — hindari duplikat.
      const existing = await db.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      })
      if (existing) return existing

      try {
        return await db.category.create({ data: { name } })
      } catch (err: unknown) {
        // Fallback: jika race condition lolos, ambil yang sudah ada.
        const again = await db.category.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        })
        if (again) return again
        throw err
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
