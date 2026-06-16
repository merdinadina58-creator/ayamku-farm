import { db } from '@/lib/db'
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

    const mortalityRecord = await db.mortalityRecord.create({
      data: {
        batchId: id,
        date: new Date(date),
        quantity: parseInt(quantity),
        reason,
        notes: notes || null,
      },
    })

    return NextResponse.json(mortalityRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating mortality record:', error)
    return NextResponse.json({ error: 'Failed to create mortality record' }, { status: 500 })
  }
}
