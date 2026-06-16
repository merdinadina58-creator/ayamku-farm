import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const batch = await db.batch.findUnique({
      where: { id },
      include: {
        feedRecords: { orderBy: { date: 'desc' } },
        weightRecords: { orderBy: { date: 'desc' } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, terminNumber, arrivalDate, initialWeight, quantity, status, harvestDate, harvestWeight, notes } = body

    const batch = await db.batch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(terminNumber !== undefined && { terminNumber: parseInt(terminNumber) }),
        ...(arrivalDate !== undefined && { arrivalDate: new Date(arrivalDate) }),
        ...(initialWeight !== undefined && { initialWeight: parseFloat(initialWeight) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(status !== undefined && { status }),
        ...(harvestDate !== undefined && { harvestDate: harvestDate ? new Date(harvestDate) : null }),
        ...(harvestWeight !== undefined && { harvestWeight: harvestWeight ? parseFloat(harvestWeight) : null }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error updating batch:', error)
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.batch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
