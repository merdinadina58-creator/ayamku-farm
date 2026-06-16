import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const batches = await db.batch.findMany({
      include: {
        feedRecords: { orderBy: { date: 'desc' } },
        weightRecords: { orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(batches)
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

    const batch = await db.batch.create({
      data: {
        name,
        terminNumber: parseInt(terminNumber),
        arrivalDate: new Date(arrivalDate),
        initialWeight: Math.round(parseFloat(initialWeight) * 1000) / 1000,
        quantity: parseInt(quantity),
        notes: notes || null,
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
