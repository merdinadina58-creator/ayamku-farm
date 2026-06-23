import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Membuat "virtual" harvest record dari field legacy Batch.harvestDate /
 * harvestWeight / harvestQuantity / sellingPricePerKg. Dipakai saat batch
 * belum punya harvestRecords di tabel baru, tapi punya data panen lama.
 *
 * Virtual record tidak ditulis ke DB — hanya dikembalikan ke client supaya
 * frontend treat semua panen sebagai array harvestRecords (konsisten).
 */
type LegacyBatch = {
  id: string
  status: string
  harvestDate: Date | null
  harvestWeight: number | null
  harvestQuantity: number | null
  sellingPricePerKg: number | null
  updatedAt: Date
}

type HarvestRecordOut = {
  id: string
  batchId: string
  date: string
  quantity: number
  weightPerEkor: number
  sellingPricePerKg: number
  buyerName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

function virtualHarvestRecord(batch: LegacyBatch): HarvestRecordOut | null {
  if (!batch.harvestDate || !batch.harvestQuantity) return null
  return {
    id: `legacy_${batch.id}`,
    batchId: batch.id,
    date: batch.harvestDate.toISOString(),
    quantity: batch.harvestQuantity,
    weightPerEkor: batch.harvestWeight ?? 0,
    sellingPricePerKg: batch.sellingPricePerKg ?? 0,
    buyerName: null,
    notes: 'Data panen lama (migrasi)',
    createdAt: batch.updatedAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }
}

export async function GET() {
  try {
    const batches = await db.batch.findMany({
      include: {
        feedRecords: { orderBy: { date: 'desc' } },
        weightRecords: { orderBy: { date: 'desc' } },
        mortalityRecords: { orderBy: { date: 'desc' } },
        equipment: { orderBy: { purchaseDate: 'desc' } },
        harvestRecords: { orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Merge: jika batch belum punya harvestRecords tapi punya legacy fields,
    // tambahkan virtual harvest record supaya frontend konsisten.
    const merged = batches.map((b) => {
      if (b.harvestRecords.length > 0) return b
      const virtual = virtualHarvestRecord(b)
      if (!virtual) return b
      return { ...b, harvestRecords: [virtual] }
    })

    return NextResponse.json(merged)
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, terminNumber, arrivalDate, initialWeight, quantity, notes } = body

    if (!name || !terminNumber || !arrivalDate || !initialWeight || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedTerminNumber = parseInt(terminNumber)
    const parsedQuantity = parseInt(quantity)
    const parsedInitialWeight = Math.round(parseFloat(initialWeight) * 1000) / 1000
    const parsedArrivalDate = new Date(arrivalDate)

    // Wrap check-and-create in an atomic in-memory dedup so that concurrent
    // identical requests (double-click race condition) share a single result.
    const batch = await withDedup(dedupKey('batch', body), async () => {
      // Deduplication guard: if an identical batch was created in the last 60
      // seconds (e.g. from a double-click), return the existing one instead of
      // creating a duplicate.
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.batch.findFirst({
        where: {
          name,
          terminNumber: parsedTerminNumber,
          arrivalDate: parsedArrivalDate,
          quantity: parsedQuantity,
          initialWeight: parsedInitialWeight,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.batch.create({
        data: {
          name,
          terminNumber: parsedTerminNumber,
          arrivalDate: parsedArrivalDate,
          initialWeight: parsedInitialWeight,
          quantity: parsedQuantity,
          notes: notes || null,
        },
      })
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
