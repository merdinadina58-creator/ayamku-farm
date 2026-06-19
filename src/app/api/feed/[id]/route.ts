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
    const { date, feedType, quantityKg, pricePerKg, notes, notaData, notaName } = body

    if (!date || !feedType || !quantityKg || !pricePerKg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updated = await db.feedRecord.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(feedType !== undefined && { feedType }),
        ...(quantityKg !== undefined && { quantityKg: parseFloat(quantityKg) }),
        ...(pricePerKg !== undefined && { pricePerKg: parseFloat(pricePerKg) }),
        ...(notes !== undefined && { notes: notes || null }),
        // Foto nota pembelian — notaData=null untuk hapus foto, string untuk set/update.
        ...(notaData !== undefined && { notaData: notaData || null }),
        ...(notaName !== undefined && { notaName: notaName || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating feed record:', error)
    return NextResponse.json({ error: 'Failed to update feed record' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.feedRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feed record:', error)
    return NextResponse.json({ error: 'Failed to delete feed record' }, { status: 500 })
  }
}
