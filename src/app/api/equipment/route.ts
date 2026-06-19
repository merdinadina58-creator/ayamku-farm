import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/equipment
 * Mengembalikan semua peralatan lengkap dengan info termin (batch) tempat
 * peralatan itu dibeli. Mendukung filter `?batchId=xxx` bila perlu.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    const equipments = await db.equipment.findMany({
      where: batchId ? { batchId } : undefined,
      include: { batch: { select: { id: true, name: true, terminNumber: true } } },
      orderBy: { purchaseDate: 'desc' },
    })
    return NextResponse.json(equipments)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

/**
 * POST /api/equipment
 * Mencatat pembelian peralatan untuk sebuah termin (batch).
 * `batchId` wajib — peralatan selalu terikat ke termin tertentu.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, quantity, unitPrice, purchaseDate, notes, batchId, notaData, notaName } = body
    // Satuan opsional saat transisi; default "unit" jika tidak dikirim.
    const unit: string = (body?.unit ?? '').toString().trim() || 'unit'

    if (!name || !category || !quantity || !unitPrice || !purchaseDate || !batchId) {
      return NextResponse.json({ error: 'Missing required fields (termasuk batchId/termin)' }, { status: 400 })
    }

    const parsedQuantity = parseInt(quantity)
    const parsedUnitPrice = parseFloat(unitPrice)
    const parsedPurchaseDate = new Date(purchaseDate)

    // Pastikan termin (batch) benar-benar ada.
    const batchExists = await db.batch.findUnique({ where: { id: batchId }, select: { id: true } })
    if (!batchExists) {
      return NextResponse.json({ error: 'Termin tidak ditemukan' }, { status: 404 })
    }

    // Deduplication guard (double-click protection)
    const equipment = await withDedup(dedupKey('equipment', body), async () => {
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.equipment.findFirst({
        where: {
          name,
          category,
          quantity: parsedQuantity,
          unit,
          unitPrice: parsedUnitPrice,
          purchaseDate: parsedPurchaseDate,
          batchId,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.equipment.create({
        data: {
          name,
          category,
          quantity: parsedQuantity,
          unit,
          unitPrice: parsedUnitPrice,
          purchaseDate: parsedPurchaseDate,
          notes: notes || null,
          // Foto nota pembelian peralatan (base64 JPEG data URL) — opsional.
          notaData: notaData || null,
          notaName: notaName || null,
          batchId,
        },
      })
    })

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
  }
}
