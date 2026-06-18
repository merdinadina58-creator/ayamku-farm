import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, quantity, reason, notes } = body

    const updated = await db.mortalityRecord.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(reason !== undefined && { reason }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating mortality record:', error)
    return NextResponse.json({ error: 'Failed to update mortality record' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.mortalityRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting mortality record:', error)
    return NextResponse.json({ error: 'Failed to delete mortality record' }, { status: 500 })
  }
}
