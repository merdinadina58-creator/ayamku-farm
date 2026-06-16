import { db } from '@/lib/db'
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

    const weightRecord = await db.weightRecord.create({
      data: {
        batchId: id,
        date: new Date(date),
        averageWeightGram: parseFloat(averageWeightGram),
        ageDays: parseInt(ageDays),
        sampleCount: sampleCount ? parseInt(sampleCount) : 1,
        notes: notes || null,
      },
    })

    return NextResponse.json(weightRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating weight record:', error)
    return NextResponse.json({ error: 'Failed to create weight record' }, { status: 500 })
  }
}
