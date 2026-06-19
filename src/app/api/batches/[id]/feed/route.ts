import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const feedRecords = await db.feedRecord.findMany({
      where: { batchId: id },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(feedRecords)
  } catch (error) {
    console.error('Error fetching feed records:', error)
    return NextResponse.json({ error: 'Failed to fetch feed records' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, feedType, quantityKg, pricePerKg, notes, notaData, notaName } = body

    if (!date || !feedType || !quantityKg || !pricePerKg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedDate = new Date(date)
    const parsedQuantityKg = parseFloat(quantityKg)
    const parsedPricePerKg = parseFloat(pricePerKg)

    // Wrap check-and-create in an atomic in-memory dedup so that concurrent
    // identical requests (double-click race condition) share a single result.
    const feedRecord = await withDedup(dedupKey(`feed:${id}`, body), async () => {
      // Deduplication guard: if an identical feed record was created in the
      // last 60 seconds (e.g. from a double-click), return the existing one.
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.feedRecord.findFirst({
        where: {
          batchId: id,
          date: parsedDate,
          feedType,
          quantityKg: parsedQuantityKg,
          pricePerKg: parsedPricePerKg,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.feedRecord.create({
        data: {
          batchId: id,
          date: parsedDate,
          feedType,
          quantityKg: parsedQuantityKg,
          pricePerKg: parsedPricePerKg,
          notes: notes || null,
          // Foto nota pembelian (base64 JPEG data URL) — opsional.
          notaData: notaData || null,
          notaName: notaName || null,
        },
      })
    })

    return NextResponse.json(feedRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating feed record:', error)
    return NextResponse.json({ error: 'Failed to create feed record' }, { status: 500 })
  }
}
