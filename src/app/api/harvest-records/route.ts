import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Re-sync batch.status & batch.harvestDate setelah perubahan harvest records.
 *
 * Kapasitas panen = batch.quantity - totalMortality.
 * Jika total harvested >= kapasitas → status = "harvested" + harvestDate = date
 *   record panen terbaru.
 * Jika total harvested < kapasitas → status = "active" + harvestDate = null
 *   (kecuali masih ada record partial, harvestDate tetap di-set ke tanggal
 *   record terbaru sebagai referensi).
 *
 * Catatan: field legacy (harvestWeight, harvestQuantity, sellingPricePerKg)
 * TIDAK diubah — tetap dipertahankan untuk backward compat.
 */
async function resyncBatchStatus(batchId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      mortalityRecords: { select: { quantity: true } },
      harvestRecords: { select: { date: true, quantity: true }, orderBy: { date: 'desc' } },
    },
  })
  if (!batch) return

  const totalMortality = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
  const totalHarvested = batch.harvestRecords.reduce((s, h) => s + h.quantity, 0)
  const capacity = Math.max(0, batch.quantity - totalMortality)

  if (totalHarvested >= capacity && capacity > 0) {
    const latestDate = batch.harvestRecords[0]?.date ?? null
    await db.batch.update({
      where: { id: batchId },
      data: { status: 'harvested', harvestDate: latestDate },
    })
  } else {
    // Sebagian panen atau belum panen sama sekali → tetap active.
    // Reset harvestDate hanya jika tidak ada harvest record sama sekali,
    // supaya data legacy (yang sudah ada harvestDate-nya) tidak terhapus.
    if (batch.harvestRecords.length === 0) {
      await db.batch.update({
        where: { id: batchId },
        data: { status: 'active', harvestDate: null },
      })
    } else {
      await db.batch.update({
        where: { id: batchId },
        data: { status: 'active' },
      })
    }
  }
}

/**
 * GET /api/harvest-records?batchId=xxx
 * Mengembalikan daftar panen untuk sebuah termin (atau semua jika tanpa filter),
 * urut tanggal terbaru di atas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    const records = await db.harvestRecord.findMany({
      where: batchId ? { batchId } : undefined,
      include: { batch: { select: { id: true, name: true, terminNumber: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching harvest records:', error)
    return NextResponse.json({ error: 'Failed to fetch harvest records' }, { status: 500 })
  }
}

/**
 * POST /api/harvest-records
 * Mencatat satu event panen (partial harvest) untuk sebuah termin.
 *
 * Validasi:
 *  - batchId, date, quantity, weightPerEkor, sellingPricePerKg wajib
 *  - quantity > 0, weightPerEkor > 0, sellingPricePerKg >= 0
 *  - totalHarvested + quantity <= (batch.quantity - totalMortality)
 *
 * Auto-migration: jika batch punya legacy harvestQuantity tapi belum punya real
 * HarvestRecord, otomatis bikin 1 record dari legacy fields dulu sebelum
 * validasi — supaya kapasitas dihitung konsisten.
 *
 * Auto-update status:
 *  - Jika setelah insert total harvested >= kapasitas → batch.status = "harvested"
 *    + batch.harvestDate = date record terbaru.
 *  - Jika belum → batch.status tetap "active".
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { batchId, date, quantity, weightPerEkor, sellingPricePerKg, buyerName, notes } = body

    if (!batchId || !date || !quantity || !weightPerEkor) {
      return NextResponse.json(
        { error: 'Field wajib: batchId, date, quantity, weightPerEkor' },
        { status: 400 }
      )
    }

    const parsedQuantity = parseInt(quantity)
    const parsedWeight = parseFloat(weightPerEkor)
    const parsedPrice = parseFloat(sellingPricePerKg ?? '0')
    const parsedDate = new Date(date)

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json({ error: 'Jumlah ekor harus > 0' }, { status: 400 })
    }
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json({ error: 'Berat per ekor harus > 0' }, { status: 400 })
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Harga per kg tidak boleh negatif' }, { status: 400 })
    }
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Tanggal panen tidak valid' }, { status: 400 })
    }

    // Ambil batch + mortality + harvest records existing untuk validasi kapasitas.
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        mortalityRecords: { select: { quantity: true } },
        harvestRecords: { select: { quantity: true } },
      },
    })
    if (!batch) {
      return NextResponse.json({ error: 'Termin tidak ditemukan' }, { status: 404 })
    }

    // Lazy migration: jika batch punya legacy harvest data (harvestQuantity) tapi
    // belum punya real HarvestRecord di tabel baru, buatkan 1 record dari legacy
    // fields dulu supaya validasi kapasitas & status sync bekerja konsisten.
    if (
      batch.harvestRecords.length === 0 &&
      batch.harvestQuantity &&
      batch.harvestQuantity > 0
    ) {
      await db.harvestRecord.create({
        data: {
          batchId,
          date: batch.harvestDate || new Date(),
          quantity: batch.harvestQuantity,
          weightPerEkor: batch.harvestWeight ?? 0,
          sellingPricePerKg: batch.sellingPricePerKg ?? 0,
          buyerName: null,
          notes: 'Data panen lama (migrasi otomatis)',
        },
      })
      // Re-fetch supaya batch.harvestRecords terisi record baru.
      const refreshed = await db.batch.findUnique({
        where: { id: batchId },
        include: {
          mortalityRecords: { select: { quantity: true } },
          harvestRecords: { select: { quantity: true } },
        },
      })
      if (refreshed) {
        batch.mortalityRecords = refreshed.mortalityRecords
        batch.harvestRecords = refreshed.harvestRecords
      }
    }

    const totalMortality = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
    const totalHarvested = batch.harvestRecords.reduce((s, h) => s + h.quantity, 0)
    const capacity = Math.max(0, batch.quantity - totalMortality)
    const remaining = capacity - totalHarvested

    if (parsedQuantity > remaining) {
      return NextResponse.json(
        {
          error: `Jumlah melebihi sisa ayam yang bisa dipanen (tersisa ${remaining} ekor)`,
        },
        { status: 400 }
      )
    }

    // Dedup guard — cegah double-click menciptakan duplikat dalam 60 detik.
    const record = await withDedup(dedupKey('harvest-record', body), async () => {
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.harvestRecord.findFirst({
        where: {
          batchId,
          date: parsedDate,
          quantity: parsedQuantity,
          weightPerEkor: parsedWeight,
          sellingPricePerKg: parsedPrice,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) return existing

      return db.harvestRecord.create({
        data: {
          batchId,
          date: parsedDate,
          quantity: parsedQuantity,
          weightPerEkor: parsedWeight,
          sellingPricePerKg: parsedPrice,
          buyerName: buyerName?.trim() || null,
          notes: notes?.trim() || null,
        },
        include: { batch: { select: { id: true, name: true, terminNumber: true } } },
      })
    })

    // Auto-update status batch (panen selesai kalau total >= kapasitas).
    await resyncBatchStatus(batchId)

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating harvest record:', error)
    return NextResponse.json({ error: 'Failed to create harvest record' }, { status: 500 })
  }
}
