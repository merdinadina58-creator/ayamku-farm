import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weightRecords = await db.weightRecord.findMany({
      where: { batchId: id },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(weightRecords)
  } catch (error) {
    console.error('Error fetching weight records:', error)
    return NextResponse.json({ error: 'Failed to fetch weight records' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, averageWeightGram, ageDays, sampleCount, notes } = body

    if (!date || !averageWeightGram || !ageDays) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedDate = new Date(date)
    const parsedAverageWeightGram = parseFloat(averageWeightGram)
    const parsedAgeDays = parseInt(ageDays)
    const parsedSampleCount = sampleCount ? parseInt(sampleCount) : 1

    // Wrap check-and-create in an atomic in-memory dedup so that concurrent
    // identical requests (double-click race condition) share a single result.
    const weightRecord = await withDedup(dedupKey(`weight:${id}`, body), async () => {
      // Deduplication guard: if an identical weight record was created in the
      // last 60 seconds (e.g. from a double-click), return the existing one.
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.weightRecord.findFirst({
        where: {
          batchId: id,
          date: parsedDate,
          averageWeightGram: parsedAverageWeightGram,
          ageDays: parsedAgeDays,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.weightRecord.create({
        data: {
          batchId: id,
          date: parsedDate,
          averageWeightGram: parsedAverageWeightGram,
          ageDays: parsedAgeDays,
          sampleCount: parsedSampleCount,
          notes: notes || null,
        },
      })
    })

    return NextResponse.json(weightRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating weight record:', error)
    return NextResponse.json({ error: 'Failed to create weight record' }, { status: 500 })
  }
}
