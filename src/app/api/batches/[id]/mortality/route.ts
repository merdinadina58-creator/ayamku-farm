import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const mortalityRecords = await db.mortalityRecord.findMany({
      where: { batchId: id },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(mortalityRecords)
  } catch (error) {
    console.error('Error fetching mortality records:', error)
    return NextResponse.json({ error: 'Failed to fetch mortality records' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, quantity, reason, notes } = body

    if (!date || !quantity || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedDate = new Date(date)
    const parsedQuantity = parseInt(quantity)

    // Wrap check-and-create in an atomic in-memory dedup so that concurrent
    // identical requests (double-click race condition) share a single result.
    const mortalityRecord = await withDedup(dedupKey(`mortality:${id}`, body), async () => {
      // Deduplication guard: if an identical mortality record was created in
      // the last 60 seconds (e.g. from a double-click), return the existing one.
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.mortalityRecord.findFirst({
        where: {
          batchId: id,
          date: parsedDate,
          quantity: parsedQuantity,
          reason,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.mortalityRecord.create({
        data: {
          batchId: id,
          date: parsedDate,
          quantity: parsedQuantity,
          reason,
          notes: notes || null,
        },
      })
    })

    return NextResponse.json(mortalityRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating mortality record:', error)
    return NextResponse.json({ error: 'Failed to create mortality record' }, { status: 500 })
  }
}
