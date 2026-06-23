import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Re-sync batch.status & batch.harvestDate setelah perubahan harvest records.
 * Lihat penjelasan lengkap di /api/harvest-records/route.ts.
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
 * PUT /api/harvest-records/[id]
 * Memperbarui field panen (date, quantity, weightPerEkor, sellingPricePerKg,
 * buyerName, notes). Re-validasi kapasitas (exclude record yang sedang di-edit).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, quantity, weightPerEkor, sellingPricePerKg, buyerName, notes } = body

    // Pastikan record ada.
    const existing = await db.harvestRecord.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Catatan panen tidak ditemukan' }, { status: 404 })
    }

    if (!date || !quantity || !weightPerEkor) {
      return NextResponse.json(
        { error: 'Field wajib: date, quantity, weightPerEkor' },
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

    // Validasi kapasitas: total harvested (exclude this record) + new qty <= capacity.
    const batch = await db.batch.findUnique({
      where: { id: existing.batchId },
      include: {
        mortalityRecords: { select: { quantity: true } },
        harvestRecords: { select: { id: true, quantity: true } },
      },
    })
    if (!batch) {
      return NextResponse.json({ error: 'Termin tidak ditemukan' }, { status: 404 })
    }

    const totalMortality = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
    const totalHarvestedOther = batch.harvestRecords
      .filter((h) => h.id !== id)
      .reduce((s, h) => s + h.quantity, 0)
    const capacity = Math.max(0, batch.quantity - totalMortality)
    const remaining = capacity - totalHarvestedOther

    if (parsedQuantity > remaining) {
      return NextResponse.json(
        {
          error: `Jumlah melebihi sisa ayam yang bisa dipanen (tersisa ${remaining} ekor)`,
        },
        { status: 400 }
      )
    }

    // Dedup guard untuk update.
    const updated = await withDedup(dedupKey('harvest-record-update', { id, ...body }), async () => {
      return db.harvestRecord.update({
        where: { id },
        data: {
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

    await resyncBatchStatus(existing.batchId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating harvest record:', error)
    return NextResponse.json({ error: 'Failed to update harvest record' }, { status: 500 })
  }
}

/**
 * DELETE /api/harvest-records/[id]
 * Menghapus satu catatan panen. Setelah hapus, re-check batch.status:
 * jika total harvested < kapasitas → kembalikan ke "active".
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.harvestRecord.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Catatan panen tidak ditemukan' }, { status: 404 })
    }

    await db.harvestRecord.delete({ where: { id } })

    // Re-sync status batch setelah hapus.
    await resyncBatchStatus(existing.batchId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting harvest record:', error)
    return NextResponse.json({ error: 'Failed to delete harvest record' }, { status: 500 })
  }
}
