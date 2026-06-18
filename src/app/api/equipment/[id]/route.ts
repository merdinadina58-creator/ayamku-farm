import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, quantity, unit, unitPrice, purchaseDate, notes } = body

    const updated = await db.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(unit !== undefined && { unit }),
        ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.equipment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}
