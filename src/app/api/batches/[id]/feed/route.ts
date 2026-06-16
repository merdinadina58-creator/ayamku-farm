import { db } from '@/lib/db'
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
    const { date, feedType, quantityKg, pricePerKg, notes } = body

    if (!date || !feedType || !quantityKg || !pricePerKg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const feedRecord = await db.feedRecord.create({
      data: {
        batchId: id,
        date: new Date(date),
        feedType,
        quantityKg: parseFloat(quantityKg),
        pricePerKg: parseFloat(pricePerKg),
        notes: notes || null,
      },
    })

    return NextResponse.json(feedRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating feed record:', error)
    return NextResponse.json({ error: 'Failed to create feed record' }, { status: 500 })
  }
}
